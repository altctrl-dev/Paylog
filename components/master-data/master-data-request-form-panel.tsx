/**
 * Master Data Request Form Panel (Level 2)
 *
 * Create and edit master data requests with entity-specific forms.
 * Supports: Vendor, Category, InvoiceProfile, PaymentType
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useToast } from '@/hooks/use-toast';
import {
  createRequest,
  type MasterDataEntityType,
} from '@/app/actions/master-data-requests';
import { getEntities } from '@/app/actions/admin/entities';
import { getVendors, getCategories } from '@/app/actions/master-data';
import type { PanelConfig } from '@/types/panel';

// Form-based entity types (excludes invoice_archive which is created from invoice list)
export type FormEntityType = Exclude<MasterDataEntityType, 'invoice_archive'>;

interface MasterDataRequestFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  entityType: FormEntityType;
  initialData?: Record<string, unknown>; // For resubmission
  isResubmit?: boolean;
}

// Validation schemas matching server-side schemas
const vendorRequestSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(255, 'Name too long'),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  gst_exemption: z.boolean().default(false),
  bank_details: z.string().max(1000, 'Bank details too long').optional().nullable(),
  // Note: is_active is controlled by admin during approval, not by requester
});

const categoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Name too long'),
  // Note: is_active is controlled by admin during approval, not by requester
});

const invoiceProfileRequestSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  entity_id: z.number().min(1, 'Entity is required'),
  vendor_id: z.number().min(1, 'Vendor is required'),
  category_id: z.number().min(1, 'Category is required'),
  currency_id: z.number().min(1, 'Currency is required'),
  prepaid_postpaid: z.enum(['prepaid', 'postpaid']).optional().nullable(),
  tds_applicable: z.boolean().default(false),
  tds_percentage: z.number().min(0).max(100).optional().nullable(),
  visible_to_all: z.boolean().default(true),
});

const paymentTypeRequestSchema = z.object({
  name: z.string().min(1, 'Payment type name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  requires_reference: z.boolean().default(false),
  // Note: is_active is controlled by admin during approval, not by requester
});

// Get schema based on entity type (excludes invoice_archive as it's not form-created)
function getSchema(entityType: Exclude<MasterDataEntityType, 'invoice_archive'>) {
  switch (entityType) {
    case 'vendor':
      return vendorRequestSchema;
    case 'category':
      return categoryRequestSchema;
    case 'invoice_profile':
      return invoiceProfileRequestSchema;
    case 'payment_type':
      return paymentTypeRequestSchema;
  }
}

// Get display name for entity type
function getEntityDisplayName(entityType: MasterDataEntityType): string {
  switch (entityType) {
    case 'vendor':
      return 'Vendor';
    case 'category':
      return 'Category';
    case 'invoice_profile':
      return 'Invoice Profile';
    case 'payment_type':
      return 'Payment Type';
    case 'invoice_archive':
      return 'Invoice Archive';
  }
}

export function MasterDataRequestFormPanel({
  config,
  onClose,
  entityType,
  initialData,
  isResubmit = false,
}: MasterDataRequestFormPanelProps) {
  const { closeTopPanel } = usePanel();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [masterData, setMasterData] = React.useState<{
    entities: Array<{ id: number; name: string }>;
    vendors: Array<{ id: number; name: string }>;
    categories: Array<{ id: number; name: string }>;
    currencies: Array<{ id: number; code: string; name: string }>;
  }>({
    entities: [],
    vendors: [],
    categories: [],
    currencies: [],
  });
  const [isLoadingMasterData, setIsLoadingMasterData] = React.useState(false);

  // Load master data for invoice profile forms
  const loadMasterData = React.useCallback(async () => {
    setIsLoadingMasterData(true);
    try {
      const [entitiesRes, vendorsRes, categoriesRes, currenciesRes] = await Promise.all([
        getEntities({ is_active: true, per_page: 1000 }),
        getVendors({ is_active: true, per_page: 1000 }),
        getCategories({ is_active: true, per_page: 1000 }),
        fetch('/api/admin/currencies').then((r) => r.json()),
      ]);

      setMasterData({
        entities: entitiesRes.success ? entitiesRes.data.entities : [],
        vendors: vendorsRes.success ? vendorsRes.data.vendors : [],
        categories: categoriesRes.success ? categoriesRes.data.categories : [],
        currencies:
          currenciesRes.success
            ? currenciesRes.data.filter((c: { is_active: boolean }) => c.is_active)
            : [],
      });
    } catch (error) {
      console.error('Failed to load master data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load master data options',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMasterData(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (entityType === 'invoice_profile') {
      loadMasterData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);
  // Note: loadMasterData intentionally excluded to prevent infinite loop.
  // Only re-fetch when entityType changes, not when loadMasterData function changes.
  // The loadMasterData callback depends on toast, which is recreated on every render,
  // causing an infinite cycle if included in dependency array. This is the same pattern
  // as the October 28 fix in admin-request-review-panel.tsx.

  // Form setup with entity-specific defaults
  // Note: Using 'any' for form data type due to TypeScript limitations with dynamic schemas
  // Each entity type has different schema, making strict typing impractical here
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(getSchema(entityType)) as any,
    defaultValues: initialData || getDefaultValues(entityType),
  });

  // Handle form submission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = async (data: any, status: 'draft' | 'pending_approval') => {
    setIsSubmitting(true);
    try {
      const result = await createRequest(entityType, data, status);

      if (result.success) {
        toast({
          title: 'Success',
          description:
            status === 'draft'
              ? 'Request saved as draft'
              : 'Request submitted for approval',
        });
        closeTopPanel();
        // Trigger parent refresh
        window.dispatchEvent(new CustomEvent('master-data-request-updated'));
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (data: any) => {
    handleFormSubmit(data, 'pending_approval');
  };

  const onSaveDraft = handleSubmit((data) => {
    handleFormSubmit(data, 'draft');
  });

  const entityName = getEntityDisplayName(entityType);
  const title = isResubmit
    ? `Resubmit ${entityName} Request`
    : `New ${entityName} Request`;

  return (
    <PanelLevel
      config={config}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            type="submit"
            form="master-data-request-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </>
      }
    >
      <form
        id="master-data-request-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Entity-specific form fields */}
        {entityType === 'vendor' && (
          <VendorForm register={register} control={control} errors={errors} />
        )}
        {entityType === 'category' && (
          <CategoryForm register={register} control={control} errors={errors} />
        )}
        {entityType === 'invoice_profile' && (
          <InvoiceProfileForm
            register={register}
            errors={errors}
            masterData={masterData}
            isLoadingMasterData={isLoadingMasterData}
            watch={watch}
            setValue={setValue}
          />
        )}
        {entityType === 'payment_type' && (
          <PaymentTypeForm
            register={register}
            control={control}
            errors={errors}
          />
        )}

        {/* Help text */}
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Request Process:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              • <strong>Save Draft</strong>: Save for later completion (can edit
              or delete)
            </li>
            <li>
              • <strong>Submit for Approval</strong>: Send to admin for review
            </li>
            <li>• Admin will review and approve/reject your request</li>
            <li>• You will be notified of the decision</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}

// Default values by entity type (excludes invoice_archive as it's not form-created)
function getDefaultValues(entityType: FormEntityType): Record<string, unknown> {
  switch (entityType) {
    case 'vendor':
      return {
        name: '',
        address: '',
        gst_exemption: false,
        bank_details: '',
      };
    case 'category':
      return { name: '' };
    case 'invoice_profile':
      return {
        name: '',
        description: '',
        entity_id: 0,
        vendor_id: 0,
        category_id: 0,
        currency_id: 0,
        prepaid_postpaid: undefined,
        tds_applicable: false,
        tds_percentage: undefined,
        visible_to_all: true,
      };
    case 'payment_type':
      return {
        name: '',
        description: '',
        requires_reference: false,
      };
  }
}

// Vendor-specific form fields (matching admin form)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VendorForm({ register, control, errors }: any) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          Vendor Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter vendor name"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register('address')}
          placeholder="Vendor physical or mailing address"
          rows={3}
          className={errors.address ? 'border-destructive' : ''}
        />
        {errors.address && (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Controller
            name="gst_exemption"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4"
              />
            )}
          />
          <span>GST/VAT Exempt</span>
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_details">Bank Details</Label>
        <Textarea
          id="bank_details"
          {...register('bank_details')}
          placeholder="Bank account details for payment processing"
          rows={3}
          maxLength={1000}
          className={errors.bank_details ? 'border-destructive' : ''}
        />
        {errors.bank_details && (
          <p className="text-xs text-destructive">{errors.bank_details.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Max 1000 characters
        </p>
      </div>
    </>
  );
}

// Category-specific form fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryForm({ register, errors }: any) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          Category Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter category name"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
    </>
  );
}

// Invoice Profile-specific form fields (matching admin form)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InvoiceProfileForm({ register, errors, masterData, isLoadingMasterData, watch, setValue }: any) {
  const tdsApplicable = watch('tds_applicable');

  // Check if required master data is missing
  const hasMissingMasterData =
    !isLoadingMasterData &&
    (masterData.entities.length === 0 ||
      masterData.vendors.length === 0 ||
      masterData.categories.length === 0 ||
      masterData.currencies.length === 0);

  if (isLoadingMasterData) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading master data options...
      </div>
    );
  }

  if (hasMissingMasterData) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-4">
        <p className="text-sm font-semibold text-destructive">Missing Required Master Data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You need at least one active entity, vendor, category, and currency to request an invoice profile.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {masterData.entities.length === 0 && <li>• No active entities found</li>}
          {masterData.vendors.length === 0 && <li>• No active vendors found</li>}
          {masterData.categories.length === 0 && <li>• No active categories found</li>}
          {masterData.currencies.length === 0 && <li>• No active currencies found</li>}
        </ul>
      </div>
    );
  }

  return (
    <>
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Profile Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., AWS Cloud Services, Office Supplies"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Optional description of this invoice profile"
          rows={2}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Entity Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="entity_id">
          Entity <span className="text-destructive">*</span>
        </Label>
        <Select
          id="entity_id"
          {...register('entity_id', { valueAsNumber: true })}
          className={errors.entity_id ? 'border-destructive' : ''}
        >
          <option value="">Select entity</option>
          {masterData.entities.map((entity: { id: number; name: string }) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </Select>
        {errors.entity_id && (
          <p className="text-xs text-destructive">{errors.entity_id.message}</p>
        )}
      </div>

      {/* Vendor Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="vendor_id">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <Select
          id="vendor_id"
          {...register('vendor_id', { valueAsNumber: true })}
          className={errors.vendor_id ? 'border-destructive' : ''}
        >
          <option value="">Select vendor</option>
          {masterData.vendors.map((vendor: { id: number; name: string }) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </Select>
        {errors.vendor_id && (
          <p className="text-xs text-destructive">{errors.vendor_id.message}</p>
        )}
      </div>

      {/* Category Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="category_id">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          id="category_id"
          {...register('category_id', { valueAsNumber: true })}
          className={errors.category_id ? 'border-destructive' : ''}
        >
          <option value="">Select category</option>
          {masterData.categories.map((category: { id: number; name: string }) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {errors.category_id && (
          <p className="text-xs text-destructive">{errors.category_id.message}</p>
        )}
      </div>

      {/* Currency Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="currency_id">
          Currency <span className="text-destructive">*</span>
        </Label>
        <Select
          id="currency_id"
          {...register('currency_id', { valueAsNumber: true })}
          className={errors.currency_id ? 'border-destructive' : ''}
        >
          <option value="">Select currency</option>
          {masterData.currencies.map((currency: { id: number; code: string; name: string }) => (
            <option key={currency.id} value={currency.id}>
              {currency.code} - {currency.name}
            </option>
          ))}
        </Select>
        {errors.currency_id && (
          <p className="text-xs text-destructive">{errors.currency_id.message}</p>
        )}
      </div>

      {/* Prepaid/Postpaid Radio */}
      <div className="space-y-2">
        <Label>Payment Type</Label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="prepaid"
              checked={watch('prepaid_postpaid') === 'prepaid'}
              onChange={() => setValue('prepaid_postpaid', 'prepaid')}
              className="h-4 w-4"
            />
            <span className="text-sm">Prepaid</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="postpaid"
              checked={watch('prepaid_postpaid') === 'postpaid'}
              onChange={() => setValue('prepaid_postpaid', 'postpaid')}
              className="h-4 w-4"
            />
            <span className="text-sm">Postpaid</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value=""
              checked={!watch('prepaid_postpaid')}
              onChange={() => setValue('prepaid_postpaid', undefined)}
              className="h-4 w-4"
            />
            <span className="text-sm">Not specified</span>
          </label>
        </div>
        {errors.prepaid_postpaid && (
          <p className="text-xs text-destructive">{errors.prepaid_postpaid.message}</p>
        )}
      </div>

      {/* TDS Applicable Checkbox */}
      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Checkbox
            id="tds_applicable"
            checked={tdsApplicable}
            onCheckedChange={(checked) => {
              setValue('tds_applicable', !!checked);
              if (!checked) {
                setValue('tds_percentage', undefined);
              }
            }}
          />
          <span>TDS Applicable (Tax Deducted at Source)</span>
        </Label>
      </div>

      {/* TDS Percentage - Conditional */}
      {tdsApplicable && (
        <div className="space-y-2">
          <Label htmlFor="tds_percentage">
            TDS Percentage <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tds_percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('tds_percentage', { valueAsNumber: true })}
            placeholder="e.g., 10.5"
            className={errors.tds_percentage ? 'border-destructive' : ''}
          />
          {errors.tds_percentage && (
            <p className="text-xs text-destructive">{errors.tds_percentage.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter percentage (0-100). Example: 10 for 10%
          </p>
        </div>
      )}

      {/* Visible to All */}
      <div className="flex items-start space-x-3 rounded-lg border p-4">
        <div className="flex items-center h-5">
          <Checkbox
            id="visible_to_all"
            checked={watch('visible_to_all') ?? true}
            onCheckedChange={(checked) => setValue('visible_to_all', !!checked)}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="visible_to_all" className="text-sm font-medium cursor-pointer">
            Visible to All Users
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            When unchecked, only users with explicit access grants can see and use this profile.
            Super admins can manage access in the profile detail panel.
          </p>
        </div>
      </div>

      {/* Requirements Box */}
      <div className="rounded-md border border-border bg-muted p-3 text-xs">
        <p className="mb-1 font-semibold">Requirements:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Profile name must be unique</li>
          <li>• All fields marked with * are required</li>
          <li>• TDS percentage required if TDS applicable</li>
          <li>• TDS percentage must be between 0 and 100</li>
        </ul>
      </div>
    </>
  );
}

// Payment Type-specific form fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PaymentTypeForm({ register, control, errors }: any) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          Payment Type Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter payment type name"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              value={field.value || ''}
              onChange={(e) => field.onChange(e.target.value || null)}
              placeholder="Optional description"
              rows={3}
              className="resize-none"
            />
          )}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Controller
            name="requires_reference"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4"
              />
            )}
          />
          <span>Requires Reference</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          If checked, payment reference number is mandatory
        </p>
      </div>
    </>
  );
}
