/**
 * Invoice Form Panel (Level 2)
 *
 * Create and edit invoice form with validation.
 * Uses React Hook Form + Zod for type-safe form handling.
 *
 * Field Order:
 * 1. Invoice Profile
 * 2. Vendor (REQUIRED)
 * 3. Invoice Number
 * 4. Invoice Date
 * 5. Invoice Period (from/to)
 * 6. Due Date
 * 7. Amount
 * 8. TDS Applicable
 * 9. Category
 * 10. Sub Entity
 * 11. Notes
 * 12. Added by (read-only)
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
import { Card } from '@/components/ui/card';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useSession } from 'next-auth/react';
import {
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useInvoiceFormOptions,
} from '@/hooks/use-invoices';
import { type InvoiceFormData } from '@/types/invoice';
import { invoiceFormSchema } from '@/lib/validations/invoice';
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
 * Returns a Date object (always non-null) because form requires dates
 */
function parseDateFromInput(value: string): Date {
  if (!value) return new Date(); // Return current date if empty
  return new Date(value);
}

export function InvoiceFormPanel({
  config,
  onClose,
  invoiceId,
}: InvoiceFormPanelProps) {
  const { closeTopPanel, closeAllPanels } = usePanel();
  const { data: session } = useSession();
  const isEditMode = invoiceId !== undefined;

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
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onChange', // Validate on change to show errors immediately
    defaultValues: {
      invoice_number: '',
      vendor_id: 0, // Will be required to change
      category_id: 0, // Will be required to change
      profile_id: 0, // Will be required to change
      sub_entity_id: 0, // Will be required to change
      invoice_amount: 0, // Will be required to enter valid amount
      // Date fields: Use current date as default (user can change)
      // This ensures form has valid dates for validation
      invoice_date: new Date(),
      period_start: new Date(),
      period_end: new Date(),
      due_date: new Date(),
      tds_applicable: false,
      tds_percentage: null,
      notes: null,
    },
  });

  // Watch values for conditional logic
  const watchedTdsApplicable = watch('tds_applicable');

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
        invoice_amount: invoice.invoice_amount,
        // Convert null dates to current date (form requires non-null)
        invoice_date: invoice.invoice_date ?? new Date(),
        period_start: invoice.period_start ?? new Date(),
        period_end: invoice.period_end ?? new Date(),
        due_date: invoice.due_date ?? new Date(),
        tds_applicable: invoice.tds_applicable,
        tds_percentage: invoice.tds_percentage,
        notes: invoice.notes,
      });
    }
  }, [invoice, reset]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: invoiceId,
          data,
        });
        closeAllPanels(); // Close all panels after successful edit
      } else {
        await createMutation.mutateAsync(data);
        closeTopPanel(); // Close only this panel after create
      }
    } catch (error) {
      // Error handling is done in mutation hooks
      console.error('Form submission error:', error);
    }
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
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form
        id="invoice-form"
        onSubmit={handleSubmit(onSubmit)}
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

        {/* 2. Vendor (REQUIRED) */}
        <div className="space-y-2">
          <Label htmlFor="vendor_id">
            Vendor <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="vendor_id"
            control={control}
            render={({ field }) => (
              <Select
                id="vendor_id"
                value={field.value?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? 0 : parseInt(value, 10));
                }}
                className={errors.vendor_id ? 'border-destructive' : ''}
              >
                <option value="">-- Select Vendor --</option>
                {options?.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.vendor_id && (
            <p className="text-xs text-destructive">
              {errors.vendor_id.message}
            </p>
          )}
        </div>

        {/* 3. Invoice Number + 4. Invoice Date (side by side) */}
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

        {/* 5. Invoice Period (from/to) - side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="period_start">
              Period Start <span className="text-destructive">*</span>
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
              Period End <span className="text-destructive">*</span>
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

        {/* 7. Amount */}
        <div className="space-y-2">
          <Label htmlFor="invoice_amount">
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="invoice_amount"
            type="number"
            step="0.01"
            {...register('invoice_amount', { valueAsNumber: true })}
            placeholder="0.00"
            className={errors.invoice_amount ? 'border-destructive' : ''}
          />
          {errors.invoice_amount && (
            <p className="text-xs text-destructive">
              {errors.invoice_amount.message}
            </p>
          )}
        </div>

        {/* 8. TDS Applicable + Percentage (side by side) */}
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

        {/* 9. Category + 10. Sub Entity (side by side) */}
        <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? 0 : parseInt(value, 10));
                  }}
                >
                  <option value="">-- Select Category --</option>
                  {options?.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.category_id && (
              <p className="text-xs text-destructive">
                {errors.category_id.message}
              </p>
            )}
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
            render={({ field }) => (
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

        {/* 12. Added by (read-only) */}
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
    </PanelLevel>
  );
}
