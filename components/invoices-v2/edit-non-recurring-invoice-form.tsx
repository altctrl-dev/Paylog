/**
 * Edit Non-Recurring Invoice Form Component
 *
 * Form for editing existing one-off invoices.
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
import { AmountInput } from './amount-input';
import {
  nonRecurringInvoiceSchema,
  type NonRecurringInvoiceFormData,
} from '@/lib/validations/invoice-v2';
import { useToast } from '@/hooks/use-toast';
import { useInvoiceFormOptions, useUpdateNonRecurringInvoice, useInvoiceV2 } from '@/hooks/use-invoices-v2';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { VendorTextAutocomplete } from './vendor-text-autocomplete';

/**
 * Props interface for EditNonRecurringInvoiceForm
 */
interface EditNonRecurringInvoiceFormProps {
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
 * Edit Non-Recurring Invoice Form Component
 */
export function EditNonRecurringInvoiceForm({ invoiceId, onSuccess, onCancel }: EditNonRecurringInvoiceFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Fetch existing invoice data
  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useInvoiceV2(invoiceId);

  // Fetch form options from API
  const {
    entities,
    categories,
    currencies,
    paymentTypes,
    isLoading: isLoadingOptions,
    isError: isOptionsError,
    error: optionsError,
  } = useInvoiceFormOptions();

  // Update invoice mutation
  const updateInvoice = useUpdateNonRecurringInvoice(invoiceId, onSuccess);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState,
    formState: { errors, isSubmitting },
  } = useForm<NonRecurringInvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(nonRecurringInvoiceSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      invoice_name: '',
      brief_description: null,
      vendor_id: 0,
      entity_id: 1,
      category_id: 0,
      invoice_number: '',
      invoice_date: new Date(),
      due_date: new Date(), // Default to invoice_date (today)
      invoice_received_date: null,
      currency_id: 1,
      invoice_amount: 0,
      tds_applicable: false,
      tds_percentage: null,
      is_paid: false,
      paid_date: null,
      paid_amount: null,
      paid_currency: null,
      payment_type_id: null,
      payment_reference: null,
      tds_rounded: false,
    },
  });

  // Watch values
  const watchedTdsApplicable = watch('tds_applicable');
  const watchedRecordPayment = watch('is_paid'); // Repurposed: now means "record a new payment"
  const watchedCurrencyId = watch('currency_id');

  // Pre-fill form with existing invoice data
  React.useEffect(() => {
    if (invoice) {
      const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date();
      // Use dedicated invoice_name field (fallback to description for backwards compatibility)
      setValue('invoice_name', invoice.invoice_name || invoice.description || '');
      setValue('brief_description', invoice.description);
      setValue('vendor_id', invoice.vendor_id ?? 0);
      setValue('entity_id', invoice.entity_id ?? 0);
      setValue('category_id', invoice.category_id ?? 0);
      setValue('invoice_number', invoice.invoice_number);
      setValue('invoice_date', invoiceDate);
      // Default due_date to invoice_date if not set
      setValue('due_date', invoice.due_date ? new Date(invoice.due_date) : invoiceDate);
      setValue('currency_id', invoice.currency_id ?? 1);
      setValue('invoice_amount', invoice.invoice_amount);
      setValue('tds_applicable', invoice.tds_applicable);
      setValue('tds_percentage', invoice.tds_percentage || null);
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
  const onSubmit = async (validatedData: NonRecurringInvoiceFormData) => {
    try {
      console.log('[EditNonRecurringInvoiceForm] onSubmit called with validated data:', validatedData);

      // Convert file to base64 (if provided)
      let fileBase64: string | null = null;
      if (selectedFile) {
        console.log('[EditNonRecurringInvoiceForm] Converting file to base64...');
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
        invoice_name: validatedData.invoice_name,
        brief_description: validatedData.brief_description || null,
        vendor_id: validatedData.vendor_id,
        entity_id: validatedData.entity_id,
        category_id: validatedData.category_id,
        invoice_number: validatedData.invoice_number,
        invoice_date: validatedData.invoice_date.toISOString(),
        // Default due_date to invoice_date if not set
        due_date: (validatedData.due_date || validatedData.invoice_date).toISOString(),
        invoice_received_date: null, // Not used in edit form
        invoice_amount: validatedData.invoice_amount,
        currency_id: validatedData.currency_id,
        tds_applicable: validatedData.tds_applicable,
        tds_percentage: validatedData.tds_percentage || null,
        tds_rounded: validatedData.tds_rounded ?? false, // BUG-003: Include TDS rounding preference
        is_paid: validatedData.is_paid,
        paid_date: validatedData.is_paid && validatedData.paid_date ? validatedData.paid_date.toISOString() : null,
        paid_amount: validatedData.is_paid ? validatedData.paid_amount : null,
        paid_currency: validatedData.is_paid ? validatedData.paid_currency : null,
        payment_type_id: validatedData.is_paid ? validatedData.payment_type_id : null,
        payment_reference: validatedData.is_paid ? validatedData.payment_reference : null,
      };

      // Force JSON serialization
      console.log('[EditNonRecurringInvoiceForm] Calling mutation with serializable data...');
      const serializedData = JSON.parse(JSON.stringify(updateData));
      updateInvoice.mutate(serializedData);
    } catch (error) {
      console.error('[EditNonRecurringInvoiceForm] Error in onSubmit:', error);
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

  // Render form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Invoice Name */}
      <div className="space-y-2">
        <Label htmlFor="invoice_name">Invoice Name *</Label>
        <Input
          id="invoice_name"
          {...register('invoice_name')}
          placeholder="e.g., Office Supplies - January 2024"
        />
        {errors.invoice_name && (
          <p className="text-xs text-destructive">{errors.invoice_name.message}</p>
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

      {/* Vendor */}
      <div className="space-y-2">
        <Label htmlFor="vendor_id">Vendor *</Label>
        <Controller
          name="vendor_id"
          control={control}
          render={({ field }) => (
            <VendorTextAutocomplete
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {errors.vendor_id && (
          <p className="text-xs text-destructive">{errors.vendor_id.message}</p>
        )}
      </div>

      {/* Entity and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="entity_id">Entity *</Label>
          <Controller
            name="entity_id"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value || '')}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              >
                <option value="">Select Entity</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={String(entity.id)}>
                    {entity.name}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.entity_id && (
            <p className="text-xs text-destructive">{errors.entity_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Category *</Label>
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value || '')}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.category_id && (
            <p className="text-xs text-destructive">{errors.category_id.message}</p>
          )}
        </div>
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

      {/* Record Payment Section (Optional) */}
      <InlinePaymentFields
        recordPayment={watchedRecordPayment}
        onRecordPaymentChange={(record) => setValue('is_paid', record)}
        paidDate={watch('paid_date') ?? null}
        paidAmount={watch('paid_amount') ?? null}
        paidCurrency={watch('paid_currency') ?? null}
        paymentTypeId={watch('payment_type_id') ?? null}
        paymentReference={watch('payment_reference') ?? null}
        onFieldChange={(field, value) => setValue(field as keyof NonRecurringInvoiceFormData, value)}
        invoiceCurrency={currencies.find((c) => c.id === watchedCurrencyId)?.code}
        currencies={currencies}
        paymentTypes={paymentTypes}
        control={control as unknown as Control<Record<string, unknown>>}
        errors={errors}
        tdsApplicable={watchedTdsApplicable}
        tdsPercentage={watch('tds_percentage') ?? 0}
        invoiceAmount={watch('invoice_amount')}
        tdsRounded={watch('tds_rounded') ?? false}
        onTdsRoundedChange={(rounded) => setValue('tds_rounded', rounded)}
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
                setValue('file', null);
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
        <Button type="submit" disabled={isSubmitting || updateInvoice.isPending}>
          {(isSubmitting || updateInvoice.isPending) ? 'Updating...' : 'Update Invoice'}
        </Button>
      </div>
    </form>
  );
}
