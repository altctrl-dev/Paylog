/**
 * Entity Management Component
 *
 * Full CRUD operations for entity management (formerly sub-entities).
 * Supports create, edit, archive/restore functionality.
 *
 * Created as part of Sprint 9A Phase 5-8.
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  createEntity,
  updateEntity,
  toggleEntityStatus,
  getEntities,
} from '@/app/actions/admin/entities';
import { entityFormSchema, type EntityFormData } from '@/lib/validations/master-data';

type Entity = {
  id: number;
  name: string;
  description: string | null;
  address: string;
  country: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

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

export default function EntityManagement() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EntityFormData>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      country: '',
      is_active: true,
    },
  });

  const selectedCountry = watch('country');

  // Fetch entities on mount
  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const result = await getEntities({ page: 1, per_page: 100 });

      if (result.success) {
        setEntities(result.data.entities);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load entities',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Fetch entities error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEntity(null);
    reset({
      name: '',
      description: '',
      address: '',
      country: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    reset({
      name: entity.name,
      description: entity.description || '',
      address: entity.address,
      country: entity.country,
      is_active: entity.is_active,
    });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const result = await toggleEntityStatus(id);

      if (result.success) {
        setEntities((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, is_active: result.data.is_active } : e
          )
        );

        toast({
          title: 'Success',
          description: `Entity ${currentStatus ? 'archived' : 'restored'} successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update entity status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Toggle entity status error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update entity status',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: EntityFormData) => {
    try {
      if (editingEntity) {
        const result = await updateEntity(editingEntity.id, data);

        if (result.success) {
          setEntities((prev) =>
            prev.map((e) => (e.id === editingEntity.id ? result.data : e))
          );

          toast({
            title: 'Success',
            description: 'Entity updated successfully',
          });

          setDialogOpen(false);
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to update entity',
            variant: 'destructive',
          });
        }
      } else {
        const result = await createEntity(data);

        if (result.success) {
          setEntities((prev) => [...prev, result.data]);

          toast({
            title: 'Success',
            description: 'Entity created successfully',
          });

          setDialogOpen(false);
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to create entity',
            variant: 'destructive',
          });
        }
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

  // Filter entities
  const filteredEntities = entities.filter((entity) => {
    // Status filter
    if (!showArchived && !entity.is_active) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.address.toLowerCase().includes(query) ||
        entity.country.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading entities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Entity Management</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage organizational entities with addresses and country information
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Entity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name, address, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="mr-2 h-4 w-4 rounded border-gray-300"
          />
          Show archived
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold">Address</th>
              <th className="p-3 text-left text-sm font-semibold">Country</th>
              <th className="p-3 text-left text-sm font-semibold">Status</th>
              <th className="p-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntities.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No entities found
                </td>
              </tr>
            ) : (
              filteredEntities.map((entity) => (
                <tr key={entity.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-3 text-sm font-medium">{entity.name}</td>
                  <td className="max-w-xs truncate p-3 text-sm">{entity.address}</td>
                  <td className="p-3 font-mono text-sm">{entity.country}</td>
                  <td className="p-3 text-sm">
                    <Badge variant={entity.is_active ? 'default' : 'secondary'}>
                      {entity.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {entity.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(entity.id, true)}
                          disabled={entity.invoiceCount > 0}
                          title={
                            entity.invoiceCount > 0
                              ? `Cannot archive entity with ${entity.invoiceCount} invoice(s)`
                              : 'Archive entity'
                          }
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(entity.id, false)}
                          title="Restore entity"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? 'Edit Entity' : 'Create Entity'}
            </DialogTitle>
            <DialogDescription>
              {editingEntity
                ? 'Update entity information'
                : 'Add a new organizational entity'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
                  <p className="mt-1 text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Optional entity description"
                  rows={2}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
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
                  <p className="mt-1 text-xs text-destructive">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <select
                  id="country"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <p className="mt-1 text-xs text-destructive">
                    {errors.country.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : editingEntity
                  ? 'Update Entity'
                  : 'Create Entity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
