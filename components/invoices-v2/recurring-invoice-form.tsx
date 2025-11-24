/**
 * Recurring Invoice Form Component
 *
 * Form for creating recurring invoices from invoice profiles.
 * Vendor, entity, and category are locked from profile selection.
 * Shows preview panel before final submission (Phase 3 will add Server Actions).
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TDSSection } from './tds-section';
import { InlinePaymentFields } from './inline-payment-fields';
import { InvoicePreviewPanel } from './invoice-preview-panel';
import {
  recurringInvoiceSchema,
  type RecurringInvoiceFormData,
} from '@/lib/validations/invoice-v2';
import { useToast } from '@/hooks/use-toast';
import { useInvoiceFormOptions, useCreateRecurringInvoice } from '@/hooks/use-invoices-v2';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Props interface for RecurringInvoiceForm
 */
interface RecurringInvoiceFormProps {
  /** Callback when invoice is successfully created */
  onSuccess?: (invoiceId: number) => void;
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
 * Recurring Invoice Form Component
 *
 * Phase 4: Integrated with Server Actions and React Query
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RecurringInvoiceForm({ onSuccess: _onSuccess, onCancel }: RecurringInvoiceFormProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_previewData, setPreviewData] = React.useState<RecurringInvoiceFormData | null>(null);

  // Fetch form options from API
  const {
    profiles: invoiceProfiles,
    currencies,
    paymentTypes,
    isLoading,
    isError,
    error,
  } = useInvoiceFormOptions();

  // Create invoice mutation
  const createInvoice = useCreateRecurringInvoice();

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recurringInvoiceSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      invoice_profile_id: 0,
      brief_description: null,
      invoice_number: '',
      invoice_date: new Date(), // Default to today
      due_date: new Date(), // Default to today
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
  const watchedProfileId = watch('invoice_profile_id');
  const watchedTdsApplicable = watch('tds_applicable');
  const watchedIsPaid = watch('is_paid');
  const watchedCurrencyId = watch('currency_id');

  // Load profile defaults when profile changes
  React.useEffect(() => {
    if (watchedProfileId > 0) {
      const profile = invoiceProfiles.find((p) => p.id === watchedProfileId);
      if (profile) {
        setValue('currency_id', profile.currency.id);
        setValue('tds_applicable', profile.tds_applicable);
        setValue('tds_percentage', profile.tds_percentage);
        // TODO: Set locked vendor, entity, category from profile (displayed in preview)
      }
    }
  }, [watchedProfileId, invoiceProfiles, setValue]);

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

  // Handle form submission (show preview)
  const onSubmit = async (data: RecurringInvoiceFormData) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  // Handle final confirmation (submit to Server Action)
  const handleConfirm = async () => {
    try {
      console.log('[RecurringInvoiceForm] handleConfirm called');
      const formValues = watch();
      console.log('[RecurringInvoiceForm] Form values:', formValues);

      // Validate file
      if (!selectedFile) {
        console.error('[RecurringInvoiceForm] No file selected!');
        toast({
          title: 'Error',
          description: 'Invoice file is required',
          variant: 'destructive',
        });
        return;
      }

      // Validate required fields
      if (!formValues.invoice_date || !formValues.due_date || !formValues.period_start || !formValues.period_end) {
        console.error('[RecurringInvoiceForm] Missing required date fields');
        toast({
          title: 'Error',
          description: 'All date fields are required',
          variant: 'destructive',
        });
        return;
      }

      // Convert file to base64
      console.log('[RecurringInvoiceForm] Converting file to base64...');
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:image/png;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Build plain object (serializable)
      const data = {
        file: {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          data: fileBase64,
        },
        invoice_profile_id: formValues.invoice_profile_id,
        brief_description: formValues.brief_description || null,
        invoice_number: formValues.invoice_number,
        invoice_date: formValues.invoice_date.toISOString(),
        due_date: formValues.due_date.toISOString(),
        invoice_received_date: formValues.invoice_received_date ? formValues.invoice_received_date.toISOString() : null,
        period_start: formValues.period_start.toISOString(),
        period_end: formValues.period_end.toISOString(),
        invoice_amount: formValues.invoice_amount,
        currency_id: formValues.currency_id,
        tds_applicable: formValues.tds_applicable,
        tds_percentage: formValues.tds_percentage || null,
        is_paid: formValues.is_paid,
        paid_date: formValues.is_paid && formValues.paid_date ? formValues.paid_date.toISOString() : null,
        paid_amount: formValues.is_paid ? formValues.paid_amount : null,
        paid_currency: formValues.is_paid ? formValues.paid_currency : null,
        payment_type_id: formValues.is_paid ? formValues.payment_type_id : null,
        payment_reference: formValues.is_paid ? formValues.payment_reference : null,
      };

      // Force JSON serialization to ensure truly plain object
      console.log('[RecurringInvoiceForm] Calling mutation with serializable data...');
      const serializedData = JSON.parse(JSON.stringify(data));
      console.log('[RecurringInvoiceForm] Data after JSON serialization:', serializedData);
      createInvoice.mutate(serializedData);
      console.log('[RecurringInvoiceForm] Mutation called');
    } catch (error) {
      console.error('[RecurringInvoiceForm] Error in handleConfirm:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invoice',
        variant: 'destructive',
      });
    }
  };

  // Handle cancel preview
  const handleCancelPreview = () => {
    setShowPreview(false);
  };

  // Loading state
  if (isLoading) {
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
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load form data. Please try again.
          {error && <span className="block mt-2 text-xs">{String(error)}</span>}
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state - no invoice profiles
  if (!isLoading && invoiceProfiles.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Invoice Profiles</AlertTitle>
        <AlertDescription>
          You need to create at least one invoice profile before creating recurring invoices.
          <a href="/admin/invoice-profiles/new" className="block mt-2 text-primary underline">
            Create one now
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  // If showing preview, render preview panel
  if (showPreview) {
    const formData = watch();
    const selectedCurrency = currencies.find((c) => c.id === formData.currency_id);
    const selectedProfile = invoiceProfiles.find((p) => p.id === formData.invoice_profile_id);

    const previewData = {
      invoice_number: formData.invoice_number,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      invoice_received_date: formData.invoice_received_date,
      profile_name: selectedProfile?.name,
      profile_id: formData.invoice_profile_id,
      vendor_name: 'TODO Phase 3', // Load from profile
      entity_name: 'TODO Phase 3',
      category_name: 'TODO Phase 3',
      invoice_amount: formData.invoice_amount,
      currency_code: selectedCurrency?.code,
      currency_symbol: selectedCurrency?.symbol,
      tds_applicable: formData.tds_applicable,
      tds_percentage: formData.tds_percentage,
      is_paid: formData.is_paid,
      paid_date: formData.paid_date,
      paid_amount: formData.paid_amount,
      paid_currency: formData.paid_currency,
      payment_type_name: paymentTypes.find((pt) => pt.id === formData.payment_type_id)?.name,
      payment_reference: formData.payment_reference,
      period_start: formData.period_start,
      period_end: formData.period_end,
      brief_description: formData.brief_description,
      file_name: selectedFile?.name,
    };

    return (
      <InvoicePreviewPanel
        invoiceData={previewData}
        onConfirm={handleConfirm}
        onCancel={handleCancelPreview}
        isSubmitting={createInvoice.isPending}
        isRecurring={true}
      />
    );
  }

  // Render form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file">
          Upload Invoice <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-4">
          <Input
            id="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={handleFileChange}
            className={errors.file ? 'border-destructive' : ''}
          />
          {selectedFile && (
            <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
          )}
        </div>
        {errors.file && <p className="text-xs text-destructive">{String(errors.file.message || "")}</p>}
      </div>

      {/* Invoice Profile */}
      <div className="space-y-2">
        <Label htmlFor="invoice_profile_id">
          Invoice Profile <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="invoice_profile_id"
          control={control}
          render={({ field }) => (
            <Select
              id="invoice_profile_id"
              value={field.value?.toString() || ''}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
              className={errors.invoice_profile_id ? 'border-destructive' : ''}
            >
              <option value="">-- Select Profile --</option>
              {invoiceProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </Select>
          )}
        />
        {errors.invoice_profile_id && (
          <p className="text-xs text-destructive">{String(errors.invoice_profile_id.message || "")}</p>
        )}
      </div>

      {/* Brief Description */}
      <div className="space-y-2">
        <Label htmlFor="brief_description">Brief Description</Label>
        <Controller
          name="brief_description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="brief_description"
              value={field.value || ''}
              onChange={field.onChange}
              placeholder="Optional description..."
              rows={3}
            />
          )}
        />
        {errors.brief_description && (
          <p className="text-xs text-destructive">{String(errors.brief_description.message || "")}</p>
        )}
      </div>

      {/* Invoice Number & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice_number">
            Invoice Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="invoice_number"
            {...register('invoice_number')}
            placeholder="INV-001"
            className={errors.invoice_number ? 'border-destructive' : ''}
          />
          {errors.invoice_number && (
            <p className="text-xs text-destructive">{String(errors.invoice_number.message || "")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice_date">
            Invoice Date <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="invoice_date"
            control={control}
            render={({ field }) => (
              <Input
                id="invoice_date"
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                className={errors.invoice_date ? 'border-destructive' : ''}
              />
            )}
          />
          {errors.invoice_date && (
            <p className="text-xs text-destructive">{String(errors.invoice_date.message || "")}</p>
          )}
        </div>
      </div>

      {/* Due Date & Received Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">
            Due Date <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <Input
                id="due_date"
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                className={errors.due_date ? 'border-destructive' : ''}
              />
            )}
          />
          {errors.due_date && (
            <p className="text-xs text-destructive">{String(errors.due_date.message || "")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice_received_date">Invoice Received Date</Label>
          <Controller
            name="invoice_received_date"
            control={control}
            render={({ field }) => (
              <Input
                id="invoice_received_date"
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      {/* Period (Start/End) */}
      <div className="space-y-2">
        <Label>
          Period <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="period_start" className="text-xs text-muted-foreground">
              Start Date
            </Label>
            <Controller
              name="period_start"
              control={control}
              render={({ field }) => (
                <Input
                  id="period_start"
                  type="date"
                  value={formatDateForInput(field.value)}
                  onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                  className={errors.period_start ? 'border-destructive' : ''}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_end" className="text-xs text-muted-foreground">
              End Date
            </Label>
            <Controller
              name="period_end"
              control={control}
              render={({ field }) => (
                <Input
                  id="period_end"
                  type="date"
                  value={formatDateForInput(field.value)}
                  onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                  className={errors.period_end ? 'border-destructive' : ''}
                />
              )}
            />
          </div>
        </div>
        {(errors.period_start || errors.period_end) && (
          <p className="text-xs text-destructive">
            {String(errors.period_start?.message || errors.period_end?.message || '')}
          </p>
        )}
      </div>

      {/* Currency & Amount */}
      <div className="space-y-2">
        <Label htmlFor="invoice_amount">
          Amount <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <Controller
            name="currency_id"
            control={control}
            render={({ field }) => (
              <Select
                id="currency_id"
                value={field.value?.toString() || ''}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                className={errors.currency_id ? 'border-destructive' : ''}
              >
                <option value="">--</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} {currency.symbol}
                  </option>
                ))}
              </Select>
            )}
          />

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
        {(errors.invoice_amount || errors.currency_id) && (
          <p className="text-xs text-destructive">
            {String(errors.invoice_amount?.message || errors.currency_id?.message || '')}
          </p>
        )}
      </div>

      {/* TDS Section */}
      <TDSSection
        tdsApplicable={watchedTdsApplicable}
        onTdsApplicableChange={(applicable) => setValue('tds_applicable', applicable)}
        tdsPercentage={watch('tds_percentage') ?? null}
        onTdsPercentageChange={(percentage) => setValue('tds_percentage', percentage)}
        defaultTdsApplicable={
          invoiceProfiles.find((p) => p.id === watchedProfileId)?.tds_applicable
        }
        defaultTdsPercentage={
          invoiceProfiles.find((p) => p.id === watchedProfileId)?.tds_percentage
        }
        errors={errors as Record<string, { message?: string }>}
        control={control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        showDefaultsInfo={watchedProfileId > 0}
      />

      {/* Payment Section */}
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
        errors={errors as Record<string, { message?: string }>}
        control={control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
      />

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Preview & Submit
        </Button>
      </div>
    </form>
  );
}
