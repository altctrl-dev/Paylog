/**
 * Payment Type Form Panel (Create/Edit)
 *
 * Form for creating or editing payment types (admin only).
 * Follows panel patterns from category-form-panel.tsx
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
import { useCreatePaymentType, useUpdatePaymentType } from '@/hooks/use-payment-types';
import { paymentTypeFormSchema, type PaymentTypeFormData } from '@/lib/validations/master-data';
import type { PanelConfig } from '@/types/panel';

interface PaymentTypeFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  paymentType?: {
    id: number;
    name: string;
    description?: string | null;
    requires_reference: boolean;
  };
}

export function PaymentTypeFormPanel({ config, onClose, paymentType }: PaymentTypeFormPanelProps) {
  const isEdit = !!paymentType;
  const createMutation = useCreatePaymentType();
  const updateMutation = useUpdatePaymentType();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentTypeFormData>({
    resolver: zodResolver(paymentTypeFormSchema),
    defaultValues: {
      name: paymentType?.name || '',
      description: paymentType?.description || '',
      requires_reference: paymentType?.requires_reference || false,
    },
  });

  const requiresReference = watch('requires_reference');

  const onSubmit = async (data: PaymentTypeFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: paymentType.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Payment type form error:', error);
    }
  };

  return (
    <PanelLevel
      config={config}
      title={isEdit ? 'Edit Payment Type' : 'Create Payment Type'}
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
            Payment Type Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter payment type name"
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Optional description of this payment type"
            rows={3}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="requires_reference"
            checked={requiresReference}
            onCheckedChange={(checked) => setValue('requires_reference', checked === true)}
          />
          <Label htmlFor="requires_reference" className="text-sm font-normal cursor-pointer">
            Requires Reference Number
          </Label>
        </div>
        <p className="text-xs text-muted-foreground -mt-2 ml-6">
          Enable this if payments of this type require a reference number (e.g., bank transfer reference, check number)
        </p>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Requirements:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>- Payment type name must be unique (case-insensitive)</li>
            <li>- Name: 1-100 characters (required)</li>
            <li>- Description: optional field</li>
            <li>- Will be available immediately after creation</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}
