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
// InlinePaymentFields removed - payment recording now done via Payments tab
import { AmountInput } from './amount-input';
import {
  type RecurringInvoiceFormData,
} from '@/lib/validations/invoice-v2';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useInvoiceFormOptions, useUpdateRecurringInvoice, useInvoiceV2 } from '@/hooks/use-invoices-v2';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
    tds_rounded: z.boolean().optional().default(false), // BUG-003: TDS rounding preference
    // Note: Payment fields removed - payments managed via Payments tab after invoice creation
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
  );

/**
 * Edit Recurring Invoice Form Component
 */
export function EditRecurringInvoiceForm({ invoiceId, onSuccess, onCancel }: EditRecurringInvoiceFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

  // Fetch existing invoice data
  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useInvoiceV2(invoiceId);

  // Fetch form options from API
  const {
    currencies,
    // paymentTypes removed - payment recording now done via Payments tab
    isLoading: isLoadingOptions,
    isError: isOptionsError,
    error: optionsError,
  } = useInvoiceFormOptions();

  // Update invoice mutation
  const updateInvoice = useUpdateRecurringInvoice(invoiceId, onSuccess);

  // Form setup - don't set defaultValues, let setValue handle pre-filling from invoice data
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
  });

  // Watch values
  const watchedTdsApplicable = watch('tds_applicable');
  // Note: Payment recording removed from edit forms - managed via Payments tab

  // Pre-fill form with existing invoice data
  React.useEffect(() => {
    if (invoice) {
      // Get profile ID from scalar fields or relation objects
      const profileId =
        invoice.invoice_profile_id ||
        invoice.invoice_profile?.id;

      console.log('[EditRecurringInvoiceForm] Pre-filling form with invoice data:', {
        invoice_profile_id: invoice.invoice_profile_id,
        invoice_profile: invoice.invoice_profile,
        resolvedProfileId: profileId,
      });

      if (!profileId) {
        console.error('[EditRecurringInvoiceForm] ERROR: No profile ID found in invoice data!', invoice);
      }
      setValue('invoice_profile_id', profileId || 0);
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
      setValue('tds_rounded', invoice.tds_rounded ?? false); // BUG-003: Pre-fill TDS rounding preference
      // Note: Payment fields (is_paid, paid_date, paid_amount, etc.) are now
      // stored in the Payment table, not on Invoice. Payments are recorded separately.
    }
  }, [invoice, setValue]);

  // Handle ESC key to close panel (with unsaved data warning)
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // Prevent parent panel from closing

        const isDirty = Object.keys(formState.dirtyFields).length > 0;
        if (isDirty) {
          setShowDiscardDialog(true);
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
        tds_rounded: validatedData.tds_rounded ?? false, // BUG-003: Include TDS rounding preference
        // Note: Payment fields removed - payments are managed via Payments tab after invoice creation
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
  console.log('[EditRecurringInvoiceForm] Form values:', {
    invoice_profile_id: watch('invoice_profile_id'),
    invoice_number: watch('invoice_number'),
    invoice_amount: watch('invoice_amount'),
    currency_id: watch('currency_id'),
  });

  // Render form
  return (
    <>
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

          <Controller
            name="invoice_amount"
            control={control}
            render={({ field }) => (
              <AmountInput
                id="invoice_amount"
                value={field.value}
                onChange={field.onChange}
                placeholder="0.00"
                hasError={!!errors.invoice_amount}
              />
            )}
          />
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
        tdsRounded={watch('tds_rounded') ?? false}
        onTdsRoundedChange={(rounded) => setValue('tds_rounded', rounded)}
        invoiceAmount={watch('invoice_amount')}
        control={control as unknown as Control<Record<string, unknown>>}
        errors={errors}
      />

      {/* Note: Payment recording is now done separately via the Payments tab after invoice creation.
          This keeps edit forms focused on invoice details only. */}

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

      {/* Validation Errors Display (Debug) */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  <strong>{field}:</strong> {error?.message || 'Invalid value'}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
            console.log('[EditRecurringInvoiceForm] All errors:', errors);
          }}
        >
          {(isSubmitting || updateInvoice.isPending) ? 'Updating...' : 'Update Invoice'}
        </Button>
      </div>
    </form>

    {/* Discard Changes Confirmation Dialog */}
    <ConfirmationDialog
      open={showDiscardDialog}
      onOpenChange={setShowDiscardDialog}
      title="Discard Changes"
      description="You have unsaved changes. Are you sure you want to close without saving?"
      variant="warning"
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
      onConfirm={() => {
        setShowDiscardDialog(false);
        onCancel?.();
      }}
    />
    </>
  );
}
