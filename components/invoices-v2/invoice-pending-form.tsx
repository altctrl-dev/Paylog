/**
 * Invoice Pending Form Component
 *
 * Form for recording a payment when the invoice has not been received yet.
 * Captures payment details and basic invoice info.
 * Invoice details (number, date, due date, file) can be added later.
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { VendorTextAutocomplete } from './vendor-text-autocomplete';
import { VendorFormPanel } from '@/components/master-data/vendor-form-panel';
import { TDSSection } from './tds-section';
import { AmountInput } from './amount-input';
import {
  invoicePendingSchema,
  type InvoicePendingFormData,
} from '@/lib/validations/invoice-v2';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useInvoiceFormOptions, useCreateInvoicePending } from '@/hooks/use-invoices-v2';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Props
// ============================================================================

interface InvoicePendingFormProps {
  /** Callback when invoice is successfully created */
  onSuccess?: (invoiceId: number) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function InvoicePendingForm({ onSuccess, onCancel }: InvoicePendingFormProps) {
  const [pendingNewVendorName, setPendingNewVendorName] = React.useState<string | null>(null);
  const [showVendorPanel, setShowVendorPanel] = React.useState(false);

  // Fetch form options
  const {
    entities,
    categories,
    currencies,
    paymentTypes,
    isLoading,
    isError,
    error,
  } = useInvoiceFormOptions();

  // Mutation hook
  const createMutation = useCreateInvoicePending();

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoicePendingFormData>({
    resolver: zodResolver(invoicePendingSchema),
    defaultValues: {
      invoice_name: '',
      brief_description: '',
      vendor_id: 0,
      entity_id: 1,
      category_id: 0,
      currency_id: 1,
      invoice_amount: 0,
      tds_applicable: false,
      tds_percentage: null,
      tds_rounded: false,
      paid_date: new Date(),
      paid_amount: 0,
      paid_currency: 'INR',
      payment_type_id: 0,
      payment_reference: '',
    },
  });

  // Watch fields for conditional rendering
  const watchedTdsApplicable = watch('tds_applicable');
  const watchedTdsPercentage = watch('tds_percentage');
  const watchedInvoiceAmount = watch('invoice_amount');
  const watchedCurrencyId = watch('currency_id');
  const watchedPaymentTypeId = watch('payment_type_id');

  // Get currency for display
  const selectedCurrency = currencies?.find((c) => c.id === watchedCurrencyId);

  // Check if payment type requires reference
  const selectedPaymentType = paymentTypes?.find((pt) => pt.id === watchedPaymentTypeId);
  const requiresReference = selectedPaymentType?.requires_reference ?? false;

  // Handle vendor selection from autocomplete
  const handleVendorChange = (vendorId: number | null, vendorName: string) => {
    setValue('vendor_id', vendorId || 0);
    if (!vendorId && vendorName) {
      // New vendor - store the name for later
      setPendingNewVendorName(vendorName);
    } else {
      setPendingNewVendorName(null);
    }
  };

  // Handle vendor creation request
  const handleCreateNewVendor = (vendorName: string) => {
    setPendingNewVendorName(vendorName);
    setShowVendorPanel(true);
  };

  // Handle vendor created callback
  const handleVendorCreated = (vendor: { id: number; name: string }) => {
    setShowVendorPanel(false);
    setValue('vendor_id', vendor.id);
    setPendingNewVendorName(null);
    toast.success(`Vendor "${vendor.name}" created and selected`);
  };

  // Submit handler
  const onSubmit = async (data: InvoicePendingFormData) => {
    // Check if user typed a custom vendor name (new vendor)
    if (pendingNewVendorName && !data.vendor_id) {
      // Show vendor creation panel
      handleCreateNewVendor(pendingNewVendorName);
      return;
    }

    try {
      // Prepare serialized data
      const serializedData = {
        invoice_name: data.invoice_name,
        brief_description: data.brief_description || null,
        vendor_id: data.vendor_id,
        entity_id: data.entity_id,
        category_id: data.category_id,
        currency_id: data.currency_id,
        invoice_amount: data.invoice_amount,
        tds_applicable: data.tds_applicable,
        tds_percentage: data.tds_percentage,
        tds_rounded: data.tds_rounded || false,
        paid_date: data.paid_date.toISOString(),
        paid_amount: data.paid_amount,
        paid_currency: selectedCurrency?.code || 'INR',
        payment_type_id: data.payment_type_id,
        payment_reference: data.payment_reference || null,
      };

      const result = await createMutation.mutateAsync(serializedData);

      if (result.success && result.data) {
        onSuccess?.(result.data.invoiceId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load form options'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Payment (Invoice Not Received)</h2>
          <p className="text-sm text-muted-foreground">
            Record a payment now, add invoice details when the invoice arrives
          </p>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Info Banner */}
            <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Invoice details (number, date, due date, attachment) can be added later when you receive the invoice.
              </AlertDescription>
            </Alert>

            {/* Invoice Name */}
            <div className="space-y-2">
              <Label htmlFor="invoice_name">
                What is this payment for? <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoice_name"
                placeholder="e.g., Deposit for office furniture"
                {...register('invoice_name')}
                className={cn(errors.invoice_name && 'border-destructive')}
              />
              {errors.invoice_name && (
                <p className="text-sm text-destructive">{errors.invoice_name.message}</p>
              )}
            </div>

            {/* Vendor */}
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
                    onChange={handleVendorChange}
                    error={errors.vendor_id?.message}
                  />
                )}
              />
            </div>

            {/* Entity & Category Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Entity */}
              <div className="space-y-2">
                <Label htmlFor="entity_id">
                  Entity <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="entity_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className={cn(errors.entity_id && 'border-destructive')}
                    >
                      <option value="">Select entity</option>
                      {entities?.map((entity) => (
                        <option key={entity.id} value={entity.id.toString()}>
                          {entity.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                {errors.entity_id && (
                  <p className="text-sm text-destructive">{errors.entity_id.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className={cn(errors.category_id && 'border-destructive')}
                    >
                      <option value="">Select category</option>
                      {categories?.map((cat) => (
                        <option key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                {errors.category_id && (
                  <p className="text-sm text-destructive">{errors.category_id.message}</p>
                )}
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="space-y-2">
              <Label>
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Controller
                  name="currency_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() || '1'}
                      onChange={(e) => {
                        const currencyId = parseInt(e.target.value) || 1;
                        field.onChange(currencyId);
                        const currency = currencies?.find((c) => c.id === currencyId);
                        if (currency) {
                          setValue('paid_currency', currency.code);
                        }
                      }}
                      className="w-24"
                    >
                      {currencies?.map((currency) => (
                        <option key={currency.id} value={currency.id.toString()}>
                          {currency.code}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                <Controller
                  name="invoice_amount"
                  control={control}
                  render={({ field }) => (
                    <AmountInput
                      value={field.value || 0}
                      onChange={(value) => {
                        field.onChange(value ?? 0);
                        // Also update paid_amount to match
                        setValue('paid_amount', value ?? 0);
                      }}
                      hasError={!!errors.invoice_amount}
                      className="flex-1"
                    />
                  )}
                />
              </div>
              {errors.invoice_amount && (
                <p className="text-sm text-destructive">{errors.invoice_amount.message}</p>
              )}
            </div>

            {/* Brief Description */}
            <div className="space-y-2">
              <Label htmlFor="brief_description">Description (Optional)</Label>
              <Textarea
                id="brief_description"
                placeholder="Additional details about this payment..."
                rows={2}
                {...register('brief_description')}
              />
            </div>

            {/* TDS Section */}
            <TDSSection
              tdsApplicable={watchedTdsApplicable}
              onTdsApplicableChange={(applicable) => setValue('tds_applicable', applicable)}
              tdsPercentage={watchedTdsPercentage ?? null}
              onTdsPercentageChange={(percentage) => setValue('tds_percentage', percentage)}
              errors={errors as Record<string, { message?: string }>}
              control={control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              showDefaultsInfo={false}
              invoiceAmount={watchedInvoiceAmount ?? 0}
              tdsRounded={watch('tds_rounded') ?? false}
              onTdsRoundedChange={(rounded) => setValue('tds_rounded', rounded)}
            />

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Payment Details</span>
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>
                Payment Date <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="paid_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground',
                          errors.paid_date && 'border-destructive'
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
              {errors.paid_date && (
                <p className="text-sm text-destructive">{errors.paid_date.message}</p>
              )}
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label>
                Payment Amount <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="paid_amount"
                control={control}
                render={({ field }) => (
                  <AmountInput
                    value={field.value || 0}
                    onChange={(value) => field.onChange(value ?? 0)}
                    hasError={!!errors.paid_amount}
                  />
                )}
              />
              {watchedTdsApplicable && watchedTdsPercentage && watchedInvoiceAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Net payable after TDS ({watchedTdsPercentage}%):{' '}
                  {selectedCurrency?.symbol || ''}
                  {(watchedInvoiceAmount - watchedInvoiceAmount * (watchedTdsPercentage / 100)).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              )}
              {errors.paid_amount && (
                <p className="text-sm text-destructive">{errors.paid_amount.message}</p>
              )}
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>
                Payment Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="payment_type_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className={cn(errors.payment_type_id && 'border-destructive')}
                  >
                    <option value="">Select payment type</option>
                    {paymentTypes?.map((pt) => (
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

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label htmlFor="payment_reference">
                Payment Reference {requiresReference && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="payment_reference"
                placeholder="Transaction ID, UTR number, etc."
                {...register('payment_reference')}
                className={cn(errors.payment_reference && 'border-destructive')}
              />
              {errors.payment_reference && (
                <p className="text-sm text-destructive">{errors.payment_reference.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {(isSubmitting || createMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Record Payment
          </Button>
        </div>
      </form>

      {/* Vendor Creation Panel */}
      {showVendorPanel && (
        <VendorFormPanel
          config={{
            id: 'vendor-create-pending',
            type: 'vendor-create',
            props: {},
            level: 3,
            zIndex: 10003,
            width: 500,
          }}
          initialName={pendingNewVendorName || ''}
          onClose={() => {
            setShowVendorPanel(false);
            setPendingNewVendorName(null);
          }}
          onSuccess={handleVendorCreated}
        />
      )}
    </>
  );
}

export default InvoicePendingForm;
