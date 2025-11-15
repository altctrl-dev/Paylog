/**
 * Invoice Form Panel (Level 2)
 *
 * Create and edit invoice form with validation.
 * Uses React Hook Form + Zod for type-safe form handling.
 *
 * Field Order:
 * 1. Invoice Profile
 * 2. Entity (NEW - Sprint 9A)
 * 3. Vendor (REQUIRED)
 * 4. Invoice Number
 * 5. Invoice Date
 * 6. Invoice Period (from/to) - OPTIONAL (Phase 3.5)
 * 7. Due Date
 * 8. Amount (with Currency dropdown) - UPDATED Sprint 9B Phase 3.5
 * 9. TDS Applicable
 * 10. Category
 * 11. Sub Entity
 * 12. Notes
 * 13. Added by (read-only)
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
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useSession } from 'next-auth/react';
import { FileUpload } from '@/components/attachments/file-upload';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { useToast } from '@/hooks/use-toast';
import {
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useInvoiceFormOptions,
  useInvoiceProfile,
} from '@/hooks/use-invoices';
import { VendorAutocomplete } from '@/components/master-data/vendor-autocomplete';
import { CategoryAutocomplete } from '@/components/master-data/category-autocomplete';
import { invoiceFormSchema, type InvoiceFormData } from '@/lib/validations/invoice';
import type { PanelConfig } from '@/types/panel';

interface InvoiceFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId?: number; // If provided, edit mode; otherwise, create mode
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
 * Returns a Date object or null for optional date fields
 */
function parseDateFromInput(value: string): Date | null {
  if (!value || value === '') return null; // Return null for optional dates
  return new Date(value);
}

export function InvoiceFormPanel({
  config,
  onClose,
  invoiceId,
}: InvoiceFormPanelProps) {
  const { closeTopPanel, closeAllPanels } = usePanel();
  const { data: session } = useSession();
  const { toast } = useToast();
  const isEditMode = invoiceId !== undefined;
  const [attachmentKey, setAttachmentKey] = React.useState(0);

  // State for staging files during invoice creation (before invoice exists)
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([]);
  const [isUploadingStaged, setIsUploadingStaged] = React.useState(false);

  // Fetch data for edit mode
  const { data: invoice, isLoading: invoiceLoading } = useInvoice(
    isEditMode ? invoiceId : null
  );

  // Fetch form options
  const { data: options, isLoading: optionsLoading } = useInvoiceFormOptions();

  // Mutations
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onBlur', // Validate on blur instead of onChange (less aggressive)
    reValidateMode: 'onBlur',
    defaultValues: {
      invoice_number: '',
      vendor_id: 0, // Will be required to change
      category_id: 0, // Will be required to change
      profile_id: 0, // Will be required to change
      sub_entity_id: 0, // Will be required to change
      entity_id: 0, // NEW: Sprint 9A
      currency_id: 0, // NEW: Sprint 9A
      invoice_amount: 0, // Will be required to enter valid amount
      // Date fields: Use current date as default (user can change)
      // This ensures form has valid dates for validation
      invoice_date: new Date(),
      period_start: null, // PHASE 3.5: No default (optional)
      period_end: null,   // PHASE 3.5: No default (optional)
      due_date: new Date(),
      tds_applicable: false,
      tds_percentage: null,
      notes: null,
    },
  });

  // Watch values for conditional logic
  const watchedTdsApplicable = watch('tds_applicable');
  const watchedProfileId = watch('profile_id');

  // Fetch profile data when profile is selected (for pre-filling)
  const { data: selectedProfile } = useInvoiceProfile(
    watchedProfileId && watchedProfileId > 0 ? watchedProfileId : null
  );

  // Reset form when invoice data loads (edit mode)
  React.useEffect(() => {
    if (invoice) {
      reset({
        invoice_number: invoice.invoice_number,
        vendor_id: invoice.vendor_id,
        // Convert null to 0 for select fields (required)
        category_id: invoice.category_id ?? 0,
        profile_id: invoice.profile_id ?? 0,
        sub_entity_id: invoice.sub_entity_id ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entity_id: (invoice as any).entity_id ?? 0, // NEW: Sprint 9A (may not exist in older invoices)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currency_id: (invoice as any).currency_id ?? 0, // NEW: Sprint 9A (may not exist in older invoices)
        invoice_amount: invoice.invoice_amount,
        // Convert null dates to current date for required fields, keep null for optional
        invoice_date: invoice.invoice_date ?? new Date(),
        period_start: invoice.period_start ?? null, // PHASE 3.5: Keep null (optional)
        period_end: invoice.period_end ?? null,     // PHASE 3.5: Keep null (optional)
        due_date: invoice.due_date ?? new Date(),
        tds_applicable: invoice.tds_applicable,
        tds_percentage: invoice.tds_percentage,
        notes: invoice.notes,
      });
    }
  }, [invoice, reset]);

  // Pre-fill fields when profile changes (create mode only)
  React.useEffect(() => {
    if (selectedProfile && !isEditMode) {
      // Pre-fill entity, vendor, category, currency
      setValue('entity_id', selectedProfile.entity_id);
      setValue('vendor_id', selectedProfile.vendor_id);
      setValue('category_id', selectedProfile.category_id);
      setValue('currency_id', selectedProfile.currency_id);

      // Pre-fill TDS
      setValue('tds_applicable', selectedProfile.tds_applicable);
      if (selectedProfile.tds_applicable && selectedProfile.tds_percentage) {
        setValue('tds_percentage', selectedProfile.tds_percentage);
      } else {
        setValue('tds_percentage', null);
      }
    }
  }, [selectedProfile, isEditMode, setValue]);

  // Debug: Log errors when they change
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form errors:', errors);
    }
  }, [errors]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (isEditMode) {
        // Check if form is dirty (has changes)
        if (!isDirty) {
          // No changes, just close
          closeAllPanels();
          return;
        }

        await updateMutation.mutateAsync({
          id: invoiceId,
          data,
        });
        closeAllPanels(); // Close all panels after successful edit
      } else {
        // Create mode: Create invoice then upload staged files
        const result = await createMutation.mutateAsync(data);

        // If there are staged files, upload them to the newly created invoice
        if (stagedFiles.length > 0 && result?.id) {
          setIsUploadingStaged(true);
          await uploadStagedFiles(result.id);
          setIsUploadingStaged(false);
        }

        closeTopPanel(); // Close only this panel after create
      }
    } catch (error) {
      // Error handling is done in mutation hooks
      console.error('Form submission error:', error);
      setIsUploadingStaged(false);
    }
  };

  // Handle form validation errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    // Show first error in toast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast({
        title: 'Validation Error',
        description: firstError.message,
        variant: 'destructive',
      });
    }
  };

  // PHASE 3.5 Change 4: Removed request handlers - users can request from Settings → My Requests

  // Handlers for attachments
  const handleUploadComplete = () => {
    // Refresh attachment list by changing key
    setAttachmentKey((prev) => prev + 1);
  };

  const handleAttachmentDeleted = () => {
    // Refresh attachment list by changing key
    setAttachmentKey((prev) => prev + 1);
  };

  // Handler for staging files during creation (before invoice exists)
  const handleStageFile = (file: File) => {
    setStagedFiles((prev) => [...prev, file]);
  };

  // Handler for removing staged files
  const handleRemoveStagedFile = (fileName: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  // Upload all staged files to newly created invoice
  const uploadStagedFiles = async (newInvoiceId: number) => {
    const uploadPromises = stagedFiles.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { uploadAttachment } = await import('@/app/actions/attachments');
        const result = await uploadAttachment(newInvoiceId, formData);

        if (!result.success) {
          toast({
            title: 'Upload Failed',
            description: `${file.name}: ${result.error}`,
            variant: 'destructive',
          });
        }

        return result.success;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast({
          title: 'Upload Failed',
          description: `${file.name}: An error occurred`,
          variant: 'destructive',
        });
        return false;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast({
        title: 'Files Uploaded',
        description: `${successCount} of ${stagedFiles.length} files uploaded successfully`,
      });
    }

    // Clear staged files after upload
    setStagedFiles([]);
  };

  const isLoading = invoiceLoading || optionsLoading;

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title={isEditMode ? 'Loading...' : 'New Invoice'}
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        }
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-muted-foreground">Loading form...</div>
        </div>
      </PanelLevel>
    );
  }

  return (
    <PanelLevel
      config={config}
      title={
        isEditMode ? `Edit Invoice ${invoice?.invoice_number}` : 'New Invoice'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="invoice-form"
            disabled={isSubmitting || isUploadingStaged || (isEditMode && !invoice)}
          >
            {isSubmitting
              ? 'Saving...'
              : isUploadingStaged
              ? 'Uploading files...'
              : 'Save'}
          </Button>
        </>
      }
    >
      <form
        id="invoice-form"
        onSubmit={handleSubmit(onSubmit, onError)}
        className="space-y-4"
      >
        {/* 1. Invoice Profile */}
        <div className="space-y-2">
          <Label htmlFor="profile_id">
            Invoice Profile <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="profile_id"
            control={control}
            render={({ field }) => (
              <Select
                id="profile_id"
                value={field.value?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? 0 : parseInt(value, 10));
                }}
              >
                <option value="">-- Select Profile --</option>
                {options?.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.profile_id && (
            <p className="text-xs text-destructive">
              {errors.profile_id.message}
            </p>
          )}
        </div>

        {/* 2. Entity (NEW - Sprint 9A, LOCKED when profile selected) */}
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
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? 0 : parseInt(value, 10));
                }}
                disabled={watchedProfileId > 0}
              >
                <option value="">-- Select Entity --</option>
                {options?.entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.entity_id && (
            <p className="text-xs text-destructive">
              {errors.entity_id.message}
            </p>
          )}
        </div>

        {/* 3. Vendor (REQUIRED, LOCKED when profile selected) */}
        <div className="space-y-2">
          <Label htmlFor="vendor_id">
            Vendor <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="vendor_id"
            control={control}
            render={({ field }) => (
              <VendorAutocomplete
                value={field.value || null}
                onChange={(vendorId) => field.onChange(vendorId || 0)}
                error={errors.vendor_id?.message}
                disabled={watchedProfileId > 0}
              />
            )}
          />
        </div>

        {/* 4. Invoice Number + 5. Invoice Date (side by side) */}
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
              <p className="text-xs text-destructive">
                {errors.invoice_number.message}
              </p>
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
                />
              )}
            />
            {errors.invoice_date && (
              <p className="text-xs text-destructive">
                {errors.invoice_date.message}
              </p>
            )}
          </div>
        </div>

        {/* 6. Invoice Period (from/to) - OPTIONAL - side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="period_start">
              Period Start
            </Label>
            <Controller
              name="period_start"
              control={control}
              render={({ field }) => (
                <Input
                  id="period_start"
                  type="date"
                  value={formatDateForInput(field.value)}
                  onChange={(e) =>
                    field.onChange(parseDateFromInput(e.target.value))
                  }
                />
              )}
            />
            {errors.period_start && (
              <p className="text-xs text-destructive">
                {errors.period_start.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_end">
              Period End
            </Label>
            <Controller
              name="period_end"
              control={control}
              render={({ field }) => (
                <Input
                  id="period_end"
                  type="date"
                  value={formatDateForInput(field.value)}
                  onChange={(e) =>
                    field.onChange(parseDateFromInput(e.target.value))
                  }
                  className={errors.period_end ? 'border-destructive' : ''}
                />
              )}
            />
            {errors.period_end && (
              <p className="text-xs text-destructive">
                {errors.period_end.message}
              </p>
            )}
          </div>
        </div>

        {/* 6. Due Date */}
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
              />
            )}
          />
          {errors.due_date && (
            <p className="text-xs text-destructive">{errors.due_date.message}</p>
          )}
        </div>

        {/* 8. Amount with Currency (PHASE 3.5: Integrated) */}
        <div className="space-y-2">
          <Label htmlFor="invoice_amount">
            Amount <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-[140px_1fr] gap-2">
            {/* Currency Dropdown - Left side */}
            <Controller
              name="currency_id"
              control={control}
              render={({ field }) => (
                <Select
                  id="currency_id"
                  value={field.value?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? 0 : parseInt(value, 10));
                  }}
                  className="h-10"
                >
                  <option value="">--</option>
                  {options?.currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} {currency.symbol}
                    </option>
                  ))}
                </Select>
              )}
            />

            {/* Amount Input - Right side */}
            <Input
              id="invoice_amount"
              type="number"
              step="0.01"
              {...register('invoice_amount', { valueAsNumber: true })}
              placeholder="0.00"
              className={errors.invoice_amount ? 'border-destructive' : ''}
            />
          </div>

          {/* Show error for either field */}
          {(errors.invoice_amount || errors.currency_id) && (
            <p className="text-xs text-destructive">
              {errors.invoice_amount?.message || errors.currency_id?.message}
            </p>
          )}
        </div>

        {/* 9. TDS Applicable + Percentage (side by side, editable) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>TDS Applicable</Label>
            <Controller
              name="tds_applicable"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-4 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={field.value === true}
                      onChange={() => field.onChange(true)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={field.value === false}
                      onChange={() => {
                        field.onChange(false);
                        // Clear percentage when TDS is not applicable
                        reset({ ...watch(), tds_percentage: null });
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              )}
            />
            {errors.tds_applicable && (
              <p className="text-xs text-destructive">
                {errors.tds_applicable.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tds_percentage">
              TDS % {watchedTdsApplicable && <span className="text-destructive">*</span>}
            </Label>
            <Controller
              name="tds_percentage"
              control={control}
              render={({ field }) => (
                <Input
                  id="tds_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="10.0"
                  disabled={!watchedTdsApplicable}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? null : parseFloat(value));
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={errors.tds_percentage ? 'border-destructive' : ''}
                />
              )}
            />
            {errors.tds_percentage && (
              <p className="text-xs text-destructive">
                {errors.tds_percentage.message}
              </p>
            )}
          </div>
        </div>

        {/* 10. Category (LOCKED when profile selected) + 11. Sub Entity (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category_id">
              Category <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <CategoryAutocomplete
                  value={field.value || null}
                  onChange={(categoryId) => field.onChange(categoryId || 0)}
                  error={errors.category_id?.message}
                  disabled={watchedProfileId > 0}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub_entity_id">
              Sub Entity <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="sub_entity_id"
              control={control}
              render={({ field }) => (
                <Select
                  id="sub_entity_id"
                  value={field.value?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? 0 : parseInt(value, 10));
                  }}
                >
                  <option value="">-- Select Sub Entity --</option>
                  {options?.subEntities.map((subEntity) => (
                    <option key={subEntity.id} value={subEntity.id}>
                      {subEntity.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.sub_entity_id && (
              <p className="text-xs text-destructive">
                {errors.sub_entity_id.message}
              </p>
            )}
          </div>
        </div>

        {/* 11. Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Controller
            name="notes"
            control={control}
            render={({ field}) => (
              <Textarea
                id="notes"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder="Add any additional notes here..."
                rows={4}
                className="resize-none"
              />
            )}
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          )}
        </div>

        {/* 13. Added by (read-only) */}
        {!isEditMode && session?.user && (
          <div className="rounded-md border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Added by:{' '}
              <span className="font-medium text-foreground">
                {session.user.name || session.user.email}
              </span>
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Form Tips:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Vendor and Invoice Number are required</li>
            <li>• Amount must be greater than 0</li>
            <li>• Period end date must be after or equal to start date</li>
            <li>• Press ESC or click Cancel to discard changes</li>
          </ul>
        </div>
      </form>

      {/* 12A. File Staging Section - OUTSIDE FORM - Only show for new invoices (create mode) */}
      {!isEditMode && (
        <div className="space-y-4 pt-4 mt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Attachments (Optional)</h3>
            <p className="text-xs text-muted-foreground">
              Files will be uploaded after invoice is created
            </p>
          </div>

          {/* Staged Files List */}
          {stagedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Staged Files ({stagedFiles.length})</p>
              <div className="space-y-2">
                {stagedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {file.name.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedFile(file.name)}
                      className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"
                    >
                      <span className="sr-only">Remove</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Picker for Staging */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-background hover:bg-accent/50 transition-colors">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => {
                  // Validate file size (10MB max)
                  if (file.size > 10485760) {
                    toast({
                      title: 'File Too Large',
                      description: `${file.name} exceeds 10MB limit`,
                      variant: 'destructive',
                    });
                    return;
                  }
                  handleStageFile(file);
                });
                // Reset input so same file can be selected again
                e.target.value = '';
              }}
              className="hidden"
              id="file-staging-input"
            />
            <label
              htmlFor="file-staging-input"
              className="cursor-pointer block"
            >
              <div className="w-12 h-12 mx-auto mb-3 text-muted-foreground">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium mb-2">
                Click to select files
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                PDF, PNG, JPG, DOCX, XLSX, CSV (max 10MB each)
              </p>
            </label>
          </div>
        </div>
      )}

      {/* 12B. Attachments Section - OUTSIDE FORM - Only show for existing invoices (edit mode) */}
      {isEditMode && invoice?.id && (
        <div className="space-y-4 pt-4 mt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Attachments</h3>
            <p className="text-xs text-muted-foreground">
              Files upload immediately (no need to save)
            </p>
          </div>

          {/* File Upload Component */}
          <FileUpload
            invoiceId={invoice.id}
            onUploadComplete={handleUploadComplete}
            onError={(error) =>
              toast({
                title: 'Upload Error',
                description: error,
                variant: 'destructive',
              })
            }
          />

          {/* Attachment List Component */}
          <AttachmentList
            invoiceId={invoice.id}
            canDelete={true}
            refreshKey={attachmentKey}
            onAttachmentDeleted={handleAttachmentDeleted}
          />
        </div>
      )}
    </PanelLevel>
  );
}
