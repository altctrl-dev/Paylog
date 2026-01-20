/**
 * Complete Invoice Details Form Component
 *
 * Form for adding invoice details to a pending invoice.
 * Used when the actual invoice arrives after a payment was already recorded.
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Upload, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AmountInput } from './amount-input';
import {
  completeInvoiceDetailsSchema,
  type CompleteInvoiceDetailsFormData,
} from '@/lib/validations/invoice-v2';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCompleteInvoiceDetails } from '@/hooks/use-invoices-v2';

// ============================================================================
// Helper Functions
// ============================================================================

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Props
// ============================================================================

interface CompleteInvoiceDetailsFormProps {
  /** Invoice ID to complete */
  invoiceId: number;
  /** Invoice name for display */
  invoiceName: string;
  /** Vendor name for display */
  vendorName: string;
  /** Current invoice amount (from initial payment) */
  currentAmount: number;
  /** Currency symbol */
  currencySymbol?: string;
  /** Callback when invoice is successfully completed */
  onSuccess?: () => void;
  /** Callback when user cancels */
  onCancel?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function CompleteInvoiceDetailsForm({
  invoiceId,
  invoiceName,
  vendorName,
  currentAmount,
  currencySymbol = '₹',
  onSuccess,
  onCancel,
}: CompleteInvoiceDetailsFormProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Mutation hook
  const completeMutation = useCompleteInvoiceDetails(invoiceId, onSuccess);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompleteInvoiceDetailsFormData>({
    resolver: zodResolver(completeInvoiceDetailsSchema),
    defaultValues: {
      file: null,
      invoice_number: '',
      invoice_date: new Date(),
      due_date: new Date(),
      invoice_received_date: new Date(),
      invoice_amount_differs: false,
      new_invoice_amount: null,
    },
  });

  // Watch fields
  const watchedAmountDiffers = watch('invoice_amount_differs');

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValue('file', file);
    }
  };

  // Handle file removal
  const handleFileRemove = () => {
    setSelectedFile(null);
    setValue('file', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit handler
  const onSubmit = async (data: CompleteInvoiceDetailsFormData) => {
    try {
      // Prepare serialized data
      let serializedFile = null;
      if (selectedFile) {
        const base64Data = await fileToBase64(selectedFile);
        serializedFile = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          data: base64Data,
        };
      }

      const serializedData = {
        file: serializedFile,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date.toISOString(),
        due_date: data.due_date.toISOString(),
        invoice_received_date: data.invoice_received_date?.toISOString() || null,
        invoice_amount_differs: data.invoice_amount_differs,
        new_invoice_amount: data.invoice_amount_differs ? data.new_invoice_amount : null,
      };

      await completeMutation.mutateAsync(serializedData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete invoice details');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">Complete Invoice Details</h2>
        <p className="text-sm text-muted-foreground">
          Add the invoice details now that the invoice has been received
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Invoice Context */}
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Invoice:</strong> {invoiceName}</p>
                <p><strong>Vendor:</strong> {vendorName}</p>
                <p><strong>Recorded Amount:</strong> {currencySymbol}{currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Invoice Attachment (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFileRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Invoice File
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, PNG, JPG, DOCX (max 10MB)
            </p>
          </div>

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoice_number">
              Invoice Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invoice_number"
              placeholder="e.g., INV-2024-001"
              {...register('invoice_number')}
              className={cn(errors.invoice_number && 'border-destructive')}
            />
            {errors.invoice_number && (
              <p className="text-sm text-destructive">{errors.invoice_number.message}</p>
            )}
          </div>

          {/* Invoice Date */}
          <div className="space-y-2">
            <Label>
              Invoice Date <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="invoice_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        errors.invoice_date && 'border-destructive'
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
            {errors.invoice_date && (
              <p className="text-sm text-destructive">{errors.invoice_date.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        errors.due_date && 'border-destructive'
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
            {errors.due_date && (
              <p className="text-sm text-destructive">{errors.due_date.message}</p>
            )}
          </div>

          {/* Invoice Received Date (Optional) */}
          <div className="space-y-2">
            <Label>Invoice Received Date (Optional)</Label>
            <Controller
              name="invoice_received_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* Amount Differs Checkbox */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-start space-x-3">
              <Controller
                name="invoice_amount_differs"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="invoice_amount_differs"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="invoice_amount_differs"
                  className="cursor-pointer font-medium"
                >
                  Invoice amount is different from the payment
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check this if the actual invoice amount differs from {currencySymbol}{currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* New Invoice Amount (shown only if amount differs) */}
            {watchedAmountDiffers && (
              <div className="space-y-2 ml-7">
                <Label>
                  Actual Invoice Amount <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="new_invoice_amount"
                  control={control}
                  render={({ field }) => (
                    <AmountInput
                      value={field.value || 0}
                      onChange={(value) => field.onChange(value)}
                      hasError={!!errors.new_invoice_amount}
                    />
                  )}
                />
                {errors.new_invoice_amount && (
                  <p className="text-sm text-destructive">{errors.new_invoice_amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The invoice status will be updated based on the new amount vs. payments recorded.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || completeMutation.isPending}>
          {(isSubmitting || completeMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Complete Invoice
        </Button>
      </div>
    </form>
  );
}

export default CompleteInvoiceDetailsForm;
