/**
 * Non-Recurring Invoice Form Component
 *
 * Form for creating one-off invoices without profile association.
 * All fields are manually entered and editable.
 * File upload is optional with warning message.
 * Shows preview panel before final submission (Phase 3 will add Server Actions).
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VendorTextAutocomplete } from './vendor-text-autocomplete';
import { VendorFormPanel } from '@/components/master-data/vendor-form-panel';
import { TDSSection } from './tds-section';
import { InlinePaymentFields } from './inline-payment-fields';
import { InvoicePreviewPanel } from './invoice-preview-panel';
import {
  nonRecurringInvoiceSchema,
  type NonRecurringInvoiceFormData,
} from '@/lib/validations/invoice-v2';
import { useToast } from '@/hooks/use-toast';
import { useInvoiceFormOptions, useCreateNonRecurringInvoice } from '@/hooks/use-invoices-v2';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Props interface for NonRecurringInvoiceForm
 */
interface NonRecurringInvoiceFormProps {
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
 * Non-Recurring Invoice Form Component
 *
 * Phase 4: Integrated with Server Actions and React Query
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NonRecurringInvoiceForm({ onSuccess: _onSuccess, onCancel }: NonRecurringInvoiceFormProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [showFileWarning, setShowFileWarning] = React.useState(false);
  const [pendingNewVendorName, setPendingNewVendorName] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_previewData, setPreviewData] = React.useState<NonRecurringInvoiceFormData | null>(null);
  const [showVendorPanel, setShowVendorPanel] = React.useState(false);

  // Fetch form options from API
  const {
    entities,
    categories,
    currencies,
    paymentTypes,
    isLoading,
    isError,
    error,
  } = useInvoiceFormOptions();

  // Create invoice mutation
  const createInvoice = useCreateNonRecurringInvoice();

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NonRecurringInvoiceFormData>({
    resolver: zodResolver(nonRecurringInvoiceSchema),
    mode: 'onBlur',
    defaultValues: {
      file: null,
      invoice_name: '',
      brief_description: null,
      vendor_id: 0,
      entity_id: 1, // Default entity
      category_id: 0,
      invoice_number: '',
      invoice_date: null,
      due_date: null,
      currency_id: 1, // Default INR
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

  // Handle form submission (check file warning first)
  const onSubmit = async (data: NonRecurringInvoiceFormData) => {
    setPreviewData(data);

    // Check if user typed a custom vendor name (new vendor)
    if (pendingNewVendorName && !data.vendor_id) {
      // Show confirmation for new vendor
      handleCreateNewVendor(pendingNewVendorName);
      return;
    }

    // If no file uploaded, show warning dialog
    if (!selectedFile) {
      setShowFileWarning(true);
      return;
    }

    // Proceed to preview
    setShowPreview(true);
  };

  // Handle file warning confirmation
  const handleProceedWithoutFile = () => {
    setShowFileWarning(false);
    setShowPreview(true);
  };

  // Handle final confirmation (submit to Server Action)
  const handleConfirm = async () => {
    try {
      console.log('[NonRecurringInvoiceForm] handleConfirm called');
      const formValues = watch();
      console.log('[NonRecurringInvoiceForm] Form values:', formValues);

      // Validate required fields
      if (!formValues.invoice_date) {
        console.error('[NonRecurringInvoiceForm] Missing required date field');
        toast({
          title: 'Error',
          description: 'Invoice date is required',
          variant: 'destructive',
        });
        return;
      }

      // Convert file to base64 if provided (optional for non-recurring)
      let fileData: { name: string; type: string; size: number; data: string } | null = null;
      if (selectedFile) {
        console.log('[NonRecurringInvoiceForm] Converting file to base64...');
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data:image/png;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          data: fileBase64,
        };
      } else {
        console.log('[NonRecurringInvoiceForm] No file selected (optional for non-recurring)');
      }

      // Build plain object (serializable)
      const data = {
        file: fileData,
        invoice_name: formValues.invoice_name,
        brief_description: formValues.brief_description || null,
        vendor_id: formValues.vendor_id,
        entity_id: formValues.entity_id,
        category_id: formValues.category_id,
        invoice_number: formValues.invoice_number,
        invoice_date: formValues.invoice_date.toISOString(),
        due_date: formValues.due_date ? formValues.due_date.toISOString() : null,
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
      console.log('[NonRecurringInvoiceForm] Calling mutation with serializable data...');
      const serializedData = JSON.parse(JSON.stringify(data));
      console.log('[NonRecurringInvoiceForm] Data after JSON serialization:', serializedData);
      createInvoice.mutate(serializedData);
      console.log('[NonRecurringInvoiceForm] Mutation called');
    } catch (error) {
      console.error('[NonRecurringInvoiceForm] Error in handleConfirm:', error);
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

  // Handle vendor creation request
  const handleCreateNewVendor = (vendorName: string) => {
    setPendingNewVendorName(vendorName);
    setShowVendorPanel(true);
  };

  // Handle successful vendor creation
  const handleVendorCreated = (newVendor: { id: number; name: string }) => {
    // Close the vendor panel
    setShowVendorPanel(false);

    // Auto-select the newly created vendor
    setValue('vendor_id', newVendor.id);

    // Clear pending vendor name
    setPendingNewVendorName(null);

    toast({
      title: 'Vendor Created',
      description: `"${newVendor.name}" has been created and selected`,
    });
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

  // Empty state - no entities or categories
  if (!isLoading && (entities.length === 0 || categories.length === 0)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Missing Master Data</AlertTitle>
        <AlertDescription>
          You need entities and categories to create invoices.
          <a href="/admin" className="block mt-2 text-primary underline">
            Go to Master Data Management
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  // If showing preview, render preview panel
  if (showPreview) {
    const formData = watch();
    const selectedCurrency = currencies.find((c) => c.id === formData.currency_id);
    const selectedEntity = entities.find((e) => e.id === formData.entity_id);
    const selectedCategory = categories.find((c) => c.id === formData.category_id);

    const previewData = {
      invoice_number: formData.invoice_number,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date ?? new Date(),
      vendor_name: 'TODO Phase 3', // Load from API
      vendor_id: formData.vendor_id,
      entity_name: selectedEntity?.name,
      entity_id: formData.entity_id,
      category_name: selectedCategory?.name,
      category_id: formData.category_id,
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
      brief_description: formData.brief_description,
      file_name: selectedFile?.name,
    };

    return (
      <InvoicePreviewPanel
        invoiceData={previewData}
        onConfirm={handleConfirm}
        onCancel={handleCancelPreview}
        isSubmitting={createInvoice.isPending}
        isRecurring={false}
      />
    );
  }

  // Render form
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="file">Upload Invoice</Label>
          <div className="flex items-center gap-4">
            <Input
              id="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
            )}
          </div>
          {!selectedFile && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-200">
                No file attached
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                You can proceed without attaching a file, but it&apos;s recommended to upload the invoice document.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Invoice Name */}
        <div className="space-y-2">
          <Label htmlFor="invoice_name">
            Invoice Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="invoice_name"
            {...register('invoice_name')}
            placeholder="e.g., Office Supplies - January 2025"
            className={errors.invoice_name ? 'border-destructive' : ''}
          />
          {errors.invoice_name && (
            <p className="text-xs text-destructive">{String(errors.invoice_name.message || '')}</p>
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
        </div>

        {/* Vendor (Smart ComboBox) */}
        <div className="space-y-2">
          <Label>
            Vendor <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="vendor_id"
            control={control}
            render={({ field }) => (
              <VendorTextAutocomplete
                value={field.value}
                onChange={(vendorId, vendorName) => {
                  field.onChange(vendorId || 0);
                  if (!vendorId && vendorName) {
                    // New vendor - store the name for later
                    setPendingNewVendorName(vendorName);
                  } else {
                    setPendingNewVendorName(null);
                  }
                }}
                error={String(errors.vendor_id?.message || '')}
                placeholder="Type vendor name..."
              />
            )}
          />
        </div>

        {/* Entity & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entity_id">
              Entity <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="entity_id"
              control={control}
              render={({ field }) => (
                <Select
                  id="entity_id"
                  value={field.value?.toString() || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  className={errors.entity_id ? 'border-destructive' : ''}
                >
                  <option value="">-- Select Entity --</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.entity_id && (
              <p className="text-xs text-destructive">{String(errors.entity_id.message || "")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">
              Category <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Select
                  id="category_id"
                  value={field.value?.toString() || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  className={errors.category_id ? 'border-destructive' : ''}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.category_id && (
              <p className="text-xs text-destructive">{String(errors.category_id.message || "")}</p>
            )}
          </div>
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

        {/* Due Date (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
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
          errors={errors as Record<string, { message?: string }>}
          control={control}
          showDefaultsInfo={false}
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
          onFieldChange={(field, value) => setValue(field as keyof NonRecurringInvoiceFormData, value)}
          invoiceCurrency={currencies.find((c) => c.id === watchedCurrencyId)?.code}
          currencies={currencies}
          paymentTypes={paymentTypes}
          errors={errors as Record<string, { message?: string }>}
          control={control}
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

      {/* File Warning Dialog */}
      <AlertDialog open={showFileWarning} onOpenChange={setShowFileWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Invoice File Attached</AlertDialogTitle>
            <AlertDialogDescription>
              You haven&apos;t attached an invoice file. While optional, it&apos;s recommended to upload the invoice document for reference. Do you want to continue without a file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back & Attach File</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithoutFile}>
              Continue Without File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vendor Creation Panel */}
      {showVendorPanel && (
        <VendorFormPanel
          config={{
            id: 'vendor-create',
            type: 'vendor-create',
            props: {},
            level: 3,
            zIndex: 10003,
            width: 500,
          }}
          initialName={pendingNewVendorName || ''}
          onClose={() => setShowVendorPanel(false)}
          onSuccess={handleVendorCreated}
        />
      )}
    </>
  );
}
