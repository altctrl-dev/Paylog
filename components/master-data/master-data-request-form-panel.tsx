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
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useToast } from '@/hooks/use-toast';
import {
  createRequest,
  type MasterDataEntityType,
  type VendorRequestData,
  type CategoryRequestData,
  type InvoiceProfileRequestData,
  type PaymentTypeRequestData,
} from '@/app/actions/master-data-requests';
import type { PanelConfig } from '@/types/panel';

interface MasterDataRequestFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  entityType: MasterDataEntityType;
  initialData?: Record<string, any>; // For resubmission
  isResubmit?: boolean;
  originalRequestId?: number;
}

// Validation schemas matching server-side schemas
const vendorRequestSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(255, 'Name too long'),
  is_active: z.boolean().default(true),
});

const categoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Name too long'),
  is_active: z.boolean().default(true),
});

const invoiceProfileRequestSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  visible_to_all: z.boolean().default(true),
});

const paymentTypeRequestSchema = z.object({
  name: z.string().min(1, 'Payment type name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  requires_reference: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type FormDataMap = {
  vendor: VendorRequestData;
  category: CategoryRequestData;
  invoice_profile: InvoiceProfileRequestData;
  payment_type: PaymentTypeRequestData;
};

// Get schema based on entity type
function getSchema(entityType: MasterDataEntityType) {
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
  }
}

export function MasterDataRequestFormPanel({
  config,
  onClose,
  entityType,
  initialData,
  isResubmit = false,
  originalRequestId,
}: MasterDataRequestFormPanelProps) {
  const { closeTopPanel } = usePanel();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form setup with entity-specific defaults
  // Using any for form data type due to TypeScript limitations with dynamic schemas
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(getSchema(entityType) as any),
    defaultValues: initialData || getDefaultValues(entityType),
  });

  // Handle form submission
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
            control={control}
            errors={errors}
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

// Default values by entity type
function getDefaultValues(entityType: MasterDataEntityType): any {
  switch (entityType) {
    case 'vendor':
      return { name: '', is_active: true };
    case 'category':
      return { name: '', is_active: true };
    case 'invoice_profile':
      return { name: '', description: '', visible_to_all: true };
    case 'payment_type':
      return {
        name: '',
        description: '',
        requires_reference: false,
        is_active: true,
      };
  }
}

// Vendor-specific form fields
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
        <Label className="flex items-center space-x-2">
          <Controller
            name="is_active"
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
          <span>Active</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Inactive vendors won&apos;t appear in dropdown lists
        </p>
      </div>
    </>
  );
}

// Category-specific form fields
function CategoryForm({ register, control, errors }: any) {
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

      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Controller
            name="is_active"
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
          <span>Active</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Inactive categories won&apos;t appear in dropdown lists
        </p>
      </div>
    </>
  );
}

// Invoice Profile-specific form fields
function InvoiceProfileForm({ register, control, errors }: any) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          Profile Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter profile name"
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
            name="visible_to_all"
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
          <span>Visible to All</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          If unchecked, only assigned users can see this profile
        </p>
      </div>
    </>
  );
}

// Payment Type-specific form fields
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

      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Controller
            name="is_active"
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
          <span>Active</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Inactive payment types won&apos;t appear in dropdown lists
        </p>
      </div>
    </>
  );
}
