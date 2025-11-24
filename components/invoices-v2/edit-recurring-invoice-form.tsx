/**
 * Edit Recurring Invoice Form Component
 *
 * Form for editing existing recurring invoices from invoice profiles.
 * Pre-fills form with existing data and uses update mutation.
 * File upload is optional (only if user wants to replace attachment).
 */

'use client';

import * as React from 'react';
import { useForm, Controller, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TDSSection } from './tds-section';
import { InlinePaymentFields } from './inline-payment-fields';
import {
  type RecurringInvoiceFormData,
} from '@/lib/validations/invoice-v2';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useInvoiceFormOptions, useUpdateRecurringInvoice, useInvoiceV2 } from '@/hooks/use-invoices-v2';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';

/**
 * Props interface for EditRecurringInvoiceForm
 */
interface EditRecurringInvoiceFormProps {
  /** Invoice ID to edit */
  invoiceId: number;
  /** Callback when invoice is successfully updated */
  onSuccess?: () => void;
  /** Callback when user cancels */
  onCancel?: () => void;
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
function parseDateFromInput(value: string): Date | null {
  if (!value || value === '') return null;
  return new Date(value);
}

/**
 * Update Recurring Invoice Schema (for edit form)
 * Same as create schema but file is optional
 * We build it manually to avoid issues with omit on refined schemas
 */
const updateRecurringInvoiceSchema = z
  .object({
    // File upload (optional for updates)
    file: z
      .custom<File>((val) => {
        // Accept File instances, null, or undefined
        return val === null || val === undefined || val instanceof File;
      })
      .refine(
        (file) => !file || file.size <= 10485760, // 10MB
        'File size must be less than 10MB'
      )
      .refine(
        (file) =>
          !file ||
          [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ].includes(file.type),
        'File must be PDF, PNG, JPG, or DOCX'
      )
      .nullable()
      .optional(),

    // Invoice Profile (mandatory, drives vendor/entity/category)
    invoice_profile_id: z.number().int().positive('Invoice profile is required'),

    // Description (optional)
    brief_description: z.string().max(500, 'Description too long').optional().nullable(),

    // Invoice details
    invoice_number: z
      .string()
      .min(1, 'Invoice number is required')
      .max(100, 'Invoice number too long'),
    invoice_date: z.date({
      required_error: 'Invoice date is required',
      invalid_type_error: 'Invalid date format',
    }),
    due_date: z.date({
      required_error: 'Due date is required',
      invalid_type_error: 'Invalid date format',
    }),
    invoice_received_date: z
      .date({
        invalid_type_error: 'Invalid date format',
      })
      .nullable()
      .optional(),

    // Period (mandatory for recurring)
    period_start: z.date({
      required_error: 'Period start date is required',
      invalid_type_error: 'Invalid date format',
    }),
    period_end: z.date({
      required_error: 'Period end date is required',
      invalid_type_error: 'Invalid date format',
    }),

    // Amount & Currency
    currency_id: z.number().int().positive('Currency is required'),
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),

    // TDS (loaded from profile, but editable)
    tds_applicable: z.boolean(),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .nullable()
      .optional(),

    // Inline payment fields (optional)
    is_paid: z.boolean().default(false),
    paid_date: z
      .date({
        invalid_type_error: 'Invalid date format',
      })
      .nullable()
      .optional(),
    paid_amount: z.number().positive('Paid amount must be greater than 0').nullable().optional(),
    paid_currency: z.string().max(3, 'Currency code too long').nullable().optional(),
    payment_type_id: z.number().int().positive('Payment type is required').nullable().optional(),
    payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),
  })
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date
      return data.due_date >= data.invoice_date;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  )
  .refine(
    (data) => {
      // Validation: period_end must be >= period_start
      return data.period_end >= data.period_start;
    },
    {
      message: 'Period end date must be after or equal to period start date',
      path: ['period_end'],
    }
  )
  .refine(
    (data) => {
      // Validation: if TDS is applicable, percentage is required
      if (data.tds_applicable && !data.tds_percentage) {
        return false;
      }
      return true;
    },
    {
      message: 'TDS percentage is required when TDS is applicable',
      path: ['tds_percentage'],
    }
  )
  .refine(
    (data) => {
      // Validation: if is_paid = true, payment fields are required
      if (data.is_paid) {
        return !!(data.paid_date && data.paid_amount && data.paid_currency && data.payment_type_id);
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is marked as paid',
      path: ['is_paid'],
    }
  );

/**
 * Edit Recurring Invoice Form Component
 */
export function EditRecurringInvoiceForm({ invoiceId, onSuccess, onCancel }: EditRecurringInvoiceFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Fetch existing invoice data
  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useInvoiceV2(invoiceId);

  // Fetch form options from API
  const {
    currencies,
    paymentTypes,
    isLoading: isLoadingOptions,
    isError: isOptionsError,
    error: optionsError,
  } = useInvoiceFormOptions();

  // Update invoice mutation
  const updateInvoice = useUpdateRecurringInvoice(invoiceId, onSuccess);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateRecurringInvoiceSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      invoice_profile_id: 0,
      brief_description: null,
      invoice_number: '',
      invoice_date: undefined,
      due_date: undefined,
      invoice_received_date: undefined,
      period_start: undefined,
      period_end: undefined,
      currency_id: 0,
      invoice_amount: 0,
      tds_applicable: false,
      tds_percentage: null,
      is_paid: false,
      paid_date: null,
      paid_amount: null,
      paid_currency: null,
      payment_type_id: null,
      payment_reference: null,
    },
  });

  // Watch values
  const watchedTdsApplicable = watch('tds_applicable');
  const watchedIsPaid = watch('is_paid');
  const watchedCurrencyId = watch('currency_id');

  // Pre-fill form with existing invoice data
  React.useEffect(() => {
    if (invoice) {
      setValue('invoice_profile_id', invoice.profile_id || 0);
      setValue('brief_description', invoice.description);
      setValue('invoice_number', invoice.invoice_number);
      // Don't set file field - it's optional for updates
      setValue('invoice_date', invoice.invoice_date ? new Date(invoice.invoice_date) : new Date());
      setValue('due_date', invoice.due_date ? new Date(invoice.due_date) : new Date());
      setValue('invoice_received_date', invoice.invoice_received_date ? new Date(invoice.invoice_received_date) : null);
      setValue('period_start', invoice.period_start ? new Date(invoice.period_start) : new Date());
      setValue('period_end', invoice.period_end ? new Date(invoice.period_end) : new Date());
      setValue('currency_id', invoice.currency_id ?? 0);
      setValue('invoice_amount', invoice.invoice_amount);
      setValue('tds_applicable', invoice.tds_applicable);
      setValue('tds_percentage', invoice.tds_percentage ?? null);
      setValue('is_paid', invoice.is_paid);
      setValue('paid_date', invoice.paid_date ? new Date(invoice.paid_date) : null);
      setValue('paid_amount', invoice.paid_amount || null);
      setValue('paid_currency', invoice.paid_currency || null);
      setValue('payment_type_id', invoice.payment_type_id || null);
      setValue('payment_reference', invoice.payment_reference || null);
    }
  }, [invoice, setValue]);

  // Handle ESC key to close panel (with unsaved data warning)
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // Prevent parent panel from closing

        const isDirty = Object.keys(formState.dirtyFields).length > 0;
        if (isDirty) {
          if (confirm('You have unsaved changes. Are you sure you want to close?')) {
            onCancel?.();
          }
        } else {
          onCancel?.();
        }
      }
    };

    window.addEventListener('keydown', handleEsc, { capture: true });
    return () => window.removeEventListener('keydown', handleEsc, { capture: true });
  }, [formState.dirtyFields, onCancel]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > 10485760) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setValue('file', file);
    }
  };

  // Handle form submission
  const onSubmit = async (validatedData: RecurringInvoiceFormData) => {
    try {
      console.log('[EditRecurringInvoiceForm] onSubmit called with validated data:', validatedData);

      // Convert file to base64 (if provided)
      let fileBase64: string | null = null;
      if (selectedFile) {
        console.log('[EditRecurringInvoiceForm] Converting file to base64...');
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data:image/png;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      // Build serialized data
      const updateData = {
        file: selectedFile && fileBase64 ? {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          data: fileBase64,
        } : null,
        invoice_profile_id: validatedData.invoice_profile_id,
        brief_description: validatedData.brief_description || null,
        invoice_number: validatedData.invoice_number,
        invoice_date: validatedData.invoice_date.toISOString(),
        due_date: validatedData.due_date.toISOString(),
        invoice_received_date: validatedData.invoice_received_date ? validatedData.invoice_received_date.toISOString() : null,
        period_start: validatedData.period_start.toISOString(),
        period_end: validatedData.period_end.toISOString(),
        invoice_amount: validatedData.invoice_amount,
        currency_id: validatedData.currency_id,
        tds_applicable: validatedData.tds_applicable,
        tds_percentage: validatedData.tds_percentage || null,
        is_paid: validatedData.is_paid,
        paid_date: validatedData.is_paid && validatedData.paid_date ? validatedData.paid_date.toISOString() : null,
        paid_amount: validatedData.is_paid ? validatedData.paid_amount : null,
        paid_currency: validatedData.is_paid ? validatedData.paid_currency : null,
        payment_type_id: validatedData.is_paid ? validatedData.payment_type_id : null,
        payment_reference: validatedData.is_paid ? validatedData.payment_reference : null,
      };

      // Force JSON serialization
      console.log('[EditRecurringInvoiceForm] Calling mutation with serializable data...');
      const serializedData = JSON.parse(JSON.stringify(updateData));
      updateInvoice.mutate(serializedData);
    } catch (error) {
      console.error('[EditRecurringInvoiceForm] Error in onSubmit:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update invoice',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoadingInvoice || isLoadingOptions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Error state
  if (invoiceError || isOptionsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load invoice data. Please try again.
          {(invoiceError || optionsError) && <span className="block mt-2 text-xs">{String(invoiceError || optionsError)}</span>}
        </AlertDescription>
      </Alert>
    );
  }

  // Debug: Log when component renders
  console.log('[EditRecurringInvoiceForm] Component rendered. Form errors:', errors);
  console.log('[EditRecurringInvoiceForm] Form isValid:', formState.isValid);
  console.log('[EditRecurringInvoiceForm] Form isDirty:', formState.isDirty);

  // Render form
  return (
    <form
      onSubmit={(e) => {
        console.log('[EditRecurringInvoiceForm] Form onSubmit event fired');
        console.log('[EditRecurringInvoiceForm] Event details:', {
          type: e.type,
          defaultPrevented: e.defaultPrevented,
          target: e.target,
        });
        return handleSubmit(onSubmit)(e);
      }}
      className="space-y-6"
    >
      {/* Invoice Profile (readonly) */}
      <div className="space-y-2">
        <Label htmlFor="invoice_profile_id">Invoice Profile *</Label>
        <Input
          type="text"
          value={invoice?.invoice_profile?.name || 'N/A'}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Invoice profile cannot be changed after creation
        </p>
      </div>

      {/* Invoice Number */}
      <div className="space-y-2">
        <Label htmlFor="invoice_number">Invoice Number *</Label>
        <Input
          id="invoice_number"
          {...register('invoice_number')}
          placeholder="INV-001"
        />
        {errors.invoice_number && (
          <p className="text-xs text-destructive">{errors.invoice_number.message}</p>
        )}
      </div>

      {/* Brief Description */}
      <div className="space-y-2">
        <Label htmlFor="brief_description">Brief Description</Label>
        <Textarea
          id="brief_description"
          {...register('brief_description')}
          placeholder="Optional notes about this invoice"
          rows={3}
        />
        {errors.brief_description && (
          <p className="text-xs text-destructive">{errors.brief_description.message}</p>
        )}
      </div>

      {/* Dates Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice_date">Invoice Date *</Label>
          <Controller
            name="invoice_date"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
              />
            )}
          />
          {errors.invoice_date && (
            <p className="text-xs text-destructive">{errors.invoice_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
              />
            )}
          />
          {errors.due_date && (
            <p className="text-xs text-destructive">{errors.due_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice_received_date">Date Received</Label>
          <Controller
            name="invoice_received_date"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      {/* Billing Period */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="period_start">Period Start *</Label>
          <Controller
            name="period_start"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
              />
            )}
          />
          {errors.period_start && (
            <p className="text-xs text-destructive">{errors.period_start.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="period_end">Period End *</Label>
          <Controller
            name="period_end"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
              />
            )}
          />
          {errors.period_end && (
            <p className="text-xs text-destructive">{errors.period_end.message}</p>
          )}
        </div>
      </div>

      {/* Currency and Amount */}
      <div className="space-y-2">
        <Label htmlFor="invoice_amount">Invoice Amount *</Label>
        <div className="grid grid-cols-[140px_1fr] gap-4">
          <div className="space-y-2">
            <Controller
              name="currency_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={String(field.value || '')}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className={errors.currency_id ? 'border-destructive' : ''}
                >
                  <option value="">--</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={String(currency.id)}>
                      {currency.code} {currency.symbol}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Input
              id="invoice_amount"
              type="number"
              step="0.01"
              {...register('invoice_amount', { valueAsNumber: true })}
              onWheel={(e) => e.currentTarget.blur()} // Disable scroll to change value
              placeholder="0.00"
              className={errors.invoice_amount ? 'border-destructive' : ''}
            />
          </div>
        </div>
        {(errors.invoice_amount || errors.currency_id) && (
          <p className="text-xs text-destructive">
            {errors.invoice_amount?.message || errors.currency_id?.message}
          </p>
        )}
      </div>

      {/* TDS Section */}
      <TDSSection
        tdsApplicable={watchedTdsApplicable}
        onTdsApplicableChange={(applicable) => setValue('tds_applicable', applicable)}
        tdsPercentage={watch('tds_percentage') ?? null}
        onTdsPercentageChange={(percentage) => setValue('tds_percentage', percentage)}
        control={control as unknown as Control<Record<string, unknown>>}
        errors={errors}
      />

      {/* Inline Payment Fields */}
      <InlinePaymentFields
        isPaid={watchedIsPaid}
        onIsPaidChange={(isPaid) => setValue('is_paid', isPaid)}
        paidDate={watch('paid_date') ?? null}
        paidAmount={watch('paid_amount') ?? null}
        paidCurrency={watch('paid_currency') ?? null}
        paymentTypeId={watch('payment_type_id') ?? null}
        paymentReference={watch('payment_reference') ?? null}
        onFieldChange={(field, value) => setValue(field as keyof RecurringInvoiceFormData, value)}
        invoiceCurrency={currencies.find((c) => c.id === watchedCurrencyId)?.code}
        currencies={currencies}
        paymentTypes={paymentTypes}
        control={control as unknown as Control<Record<string, unknown>>}
        errors={errors}
      />

      {/* File Upload (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="file">Replace Invoice File (Optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={handleFileChange}
            className="flex-1"
          />
          {selectedFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue('file', null as any);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {selectedFile && (
          <p className="text-xs text-muted-foreground">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Leave empty to keep existing attachment. Accepted: PDF, PNG, JPG, DOCX (max 10MB)
        </p>
        {errors.file && (
          <p className="text-xs text-destructive">{errors.file.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || updateInvoice.isPending}
          onClick={() => {
            console.log('[EditRecurringInvoiceForm] Submit button clicked');
            console.log('[EditRecurringInvoiceForm] isSubmitting:', isSubmitting);
            console.log('[EditRecurringInvoiceForm] isPending:', updateInvoice.isPending);
          }}
        >
          {(isSubmitting || updateInvoice.isPending) ? 'Updating...' : 'Update Invoice'}
        </Button>
      </div>
    </form>
  );
}
