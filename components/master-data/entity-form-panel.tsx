/**
 * Entity Form Panel (Create/Edit)
 *
 * Form for creating or editing entities (admin only).
 * Follows panel patterns from vendor/category panels.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PanelLevel } from '@/components/panels/panel-level';
import {
  createEntity,
  updateEntity,
} from '@/app/actions/admin/entities';
import { entityFormSchema, type EntityFormData } from '@/lib/validations/master-data';
import type { PanelConfig } from '@/types/panel';
import { useToast } from '@/hooks/use-toast';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'IN', name: 'India' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
];

interface EntityFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  entity?: {
    id: number;
    name: string;
    description?: string | null;
    address: string;
    country: string;
  };
  /** Optional callback when entity is created/updated successfully */
  onSuccess?: (entity: { id: number; name: string }) => void;
}

export function EntityFormPanel({ config, onClose, entity, onSuccess }: EntityFormPanelProps) {
  const isEdit = !!entity;
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EntityFormData>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: entity?.name || '',
      description: entity?.description || '',
      address: entity?.address || '',
      country: entity?.country || '',
      is_active: true,
    },
  });

  const selectedCountry = watch('country');

  const onSubmit = async (data: EntityFormData) => {
    try {
      let result;
      if (isEdit) {
        result = await updateEntity(entity.id, data);
      } else {
        result = await createEntity(data);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: isEdit ? 'Entity updated successfully' : 'Entity created successfully',
        });

        // Call onSuccess callback with created/updated entity
        if (onSuccess && result.data) {
          onSuccess({ id: result.data.id, name: result.data.name });
        }

        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${isEdit ? 'update' : 'create'} entity`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Entity form error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save entity',
        variant: 'destructive',
      });
    }
  };

  return (
    <PanelLevel
      config={config}
      title={isEdit ? 'Edit Entity' : 'Create Entity'}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Entity' : 'Create Entity'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">
            Entity Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter entity name"
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
            placeholder="Optional entity description"
            rows={2}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address">
            Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="address"
            {...register('address')}
            placeholder="Enter full address"
            rows={3}
          />
          {errors.address && (
            <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="country">
            Country <span className="text-destructive">*</span>
          </Label>
          <select
            id="country"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedCountry}
            onChange={(e) => setValue('country', e.target.value)}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>
          )}
        </div>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Requirements:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Entity name must be unique (case-insensitive)</li>
            <li>• Name: 1-100 characters (required)</li>
            <li>• Address and country are required</li>
            <li>• Will be available immediately after creation</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}
