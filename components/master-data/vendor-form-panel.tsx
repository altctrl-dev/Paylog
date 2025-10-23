/**
 * Vendor Form Panel (Create/Edit)
 *
 * Form for creating or editing vendors (admin only).
 * Follows panel patterns from invoice panels.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PanelLevel } from '@/components/panels/panel-level';
import { useCreateVendor, useUpdateVendor } from '@/hooks/use-vendors';
import { vendorFormSchema, type VendorFormData } from '@/lib/validations/master-data';
import type { PanelConfig } from '@/types/panel';

interface VendorFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  vendor?: {
    id: number;
    name: string;
    address?: string | null;
    gst_exemption?: boolean;
    bank_details?: string | null;
  };
}

export function VendorFormPanel({ config, onClose, vendor }: VendorFormPanelProps) {
  const isEdit = !!vendor;
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: vendor?.name || '',
      address: vendor?.address || '',
      gst_exemption: vendor?.gst_exemption ?? false,
      bank_details: vendor?.bank_details || '',
    },
  });

  const gstExemption = watch('gst_exemption');

  const onSubmit = async (data: VendorFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: vendor.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Vendor form error:', error);
    }
  };

  return (
    <PanelLevel
      config={config}
      title={isEdit ? 'Edit Vendor' : 'Create Vendor'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">
            Vendor Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter vendor name"
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            {...register('address')}
            placeholder="Vendor physical or mailing address"
            rows={3}
          />
          {errors.address && (
            <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="gst_exemption"
            checked={gstExemption}
            onCheckedChange={(checked) => setValue('gst_exemption', !!checked)}
          />
          <Label
            htmlFor="gst_exemption"
            className="text-sm font-normal cursor-pointer"
          >
            GST/VAT Exempt
          </Label>
        </div>

        <div>
          <Label htmlFor="bank_details">Bank Details</Label>
          <Textarea
            id="bank_details"
            {...register('bank_details')}
            placeholder="Bank account details for payment processing"
            rows={3}
            maxLength={1000}
          />
          {errors.bank_details && (
            <p className="mt-1 text-xs text-destructive">{errors.bank_details.message}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Max 1000 characters
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Requirements:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Vendor name must be unique (case-insensitive)</li>
            <li>• Name: 1-100 characters (required)</li>
            <li>• Address, bank details: optional</li>
            <li>• Will be available immediately after creation</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}
