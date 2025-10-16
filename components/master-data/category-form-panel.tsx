/**
 * Category Form Panel (Create/Edit)
 *
 * Form for creating or editing categories (admin only).
 * Follows panel patterns from invoice panels.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelLevel } from '@/components/panels/panel-level';
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories';
import { categoryFormSchema, type CategoryFormData } from '@/lib/validations/master-data';
import type { PanelConfig } from '@/types/panel';

interface CategoryFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  category?: { id: number; name: string };
}

export function CategoryFormPanel({ config, onClose, category }: CategoryFormPanelProps) {
  const isEdit = !!category;
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: category.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Category form error:', error);
    }
  };

  return (
    <PanelLevel
      config={config}
      title={isEdit ? 'Edit Category' : 'Create Category'}
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
            Category Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter category name"
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Requirements:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Name must be unique (case-insensitive)</li>
            <li>• Between 1-100 characters</li>
            <li>• Will be available immediately after creation</li>
          </ul>
        </div>
      </form>
    </PanelLevel>
  );
}
