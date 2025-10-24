/**
 * Invoice Profile Management Component
 *
 * Full CRUD UI for invoice profiles with 12-field schema.
 * Sprint 9B Phase 2 implementation.
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getInvoiceProfiles,
  createInvoiceProfile,
  updateInvoiceProfile,
  archiveInvoiceProfile as deleteInvoiceProfile,
} from '@/app/actions/master-data';
import { getEntities } from '@/app/actions/admin/entities';
import { getVendors, getCategories } from '@/app/actions/master-data';
import {
  invoiceProfileFormSchema,
  type InvoiceProfileFormData,
} from '@/lib/validations/master-data';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

type InvoiceProfile = {
  id: number;
  name: string;
  description: string | null;
  entity_id: number;
  vendor_id: number;
  category_id: number;
  currency_id: number;
  prepaid_postpaid: string | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  visible_to_all: boolean;
  created_at: Date;
  updated_at: Date;
  entity: { id: number; name: string };
  vendor: { id: number; name: string };
  category: { id: number; name: string };
  currency: { id: number; code: string; name: string };
  invoiceCount: number;
};

type MasterDataOptions = {
  entities: Array<{ id: number; name: string }>;
  vendors: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  currencies: Array<{ id: number; code: string; name: string }>;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InvoiceProfileManagement() {
  const [profiles, setProfiles] = useState<InvoiceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<InvoiceProfile | null>(null);
  const { toast } = useToast();

  // Load profiles
  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const result = await getInvoiceProfiles({});
      if (result.success) {
        setProfiles(result.data.profiles);
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load invoice profiles',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setEditingProfile(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (profile: InvoiceProfile) => {
    setEditingProfile(profile);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this invoice profile? This cannot be undone.')) return;

    try {
      const result = await deleteInvoiceProfile(id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invoice profile deleted',
        });
        loadProfiles();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Profile
        </Button>
      </div>

      {/* Profile List */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2">Loading profiles...</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No invoice profiles found. Create one to get started.
        </div>
      ) : (
        <ProfileTable
          profiles={profiles}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create/Edit Dialog */}
      <ProfileFormDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingProfile(null);
        }}
        profile={editingProfile}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingProfile(null);
          loadProfiles();
        }}
      />
    </div>
  );
}

// ============================================================================
// PROFILE TABLE
// ============================================================================

interface ProfileTableProps {
  profiles: InvoiceProfile[];
  onEdit: (profile: InvoiceProfile) => void;
  onDelete: (id: number) => void;
}

function ProfileTable({ profiles, onEdit, onDelete }: ProfileTableProps) {
  const formatTDS = (profile: InvoiceProfile) => {
    if (!profile.tds_applicable) return 'No TDS';
    return `${profile.tds_percentage || 0}%`;
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-semibold">Name</th>
            <th className="p-3 text-left text-sm font-semibold">Entity</th>
            <th className="p-3 text-left text-sm font-semibold">Vendor</th>
            <th className="p-3 text-left text-sm font-semibold">Category</th>
            <th className="p-3 text-center text-sm font-semibold">Currency</th>
            <th className="p-3 text-center text-sm font-semibold">TDS</th>
            <th className="p-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="p-3">
                <div className="text-sm font-medium">{profile.name}</div>
                {profile.description && (
                  <div className="text-xs text-muted-foreground truncate max-w-xs">
                    {profile.description}
                  </div>
                )}
              </td>
              <td className="p-3 text-sm">{profile.entity.name}</td>
              <td className="p-3 text-sm">{profile.vendor.name}</td>
              <td className="p-3 text-sm">{profile.category.name}</td>
              <td className="p-3 text-center text-sm font-mono">{profile.currency.code}</td>
              <td className="p-3 text-center text-sm">{formatTDS(profile)}</td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(profile)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    aria-label="Edit profile"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(profile.id)}
                    disabled={profile.invoiceCount > 0}
                    className="inline-flex items-center justify-center rounded-md p-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Delete profile"
                    title={
                      profile.invoiceCount > 0
                        ? 'Cannot delete profile with invoices'
                        : 'Delete profile'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// PROFILE FORM DIALOG
// ============================================================================

interface ProfileFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: InvoiceProfile | null;
  onSuccess: () => void;
}

function ProfileFormDialog({ isOpen, onClose, profile, onSuccess }: ProfileFormDialogProps) {
  const [masterData, setMasterData] = useState<MasterDataOptions>({
    entities: [],
    vendors: [],
    categories: [],
    currencies: [],
  });
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);
  const { toast } = useToast();

  const form = useForm<InvoiceProfileFormData>({
    resolver: zodResolver(invoiceProfileFormSchema),
    defaultValues: {
      name: '',
      description: undefined,
      entity_id: 0,
      vendor_id: 0,
      category_id: 0,
      currency_id: 0,
      prepaid_postpaid: undefined,
      tds_applicable: false,
      tds_percentage: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const tdsApplicable = watch('tds_applicable');

  // Load master data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadMasterData();
      if (profile) {
        // Pre-fill form for edit
        reset({
          name: profile.name,
          description: profile.description || undefined,
          entity_id: profile.entity_id,
          vendor_id: profile.vendor_id,
          category_id: profile.category_id,
          currency_id: profile.currency_id,
          prepaid_postpaid: (profile.prepaid_postpaid as 'prepaid' | 'postpaid' | undefined) || undefined,
          tds_applicable: profile.tds_applicable,
          tds_percentage: profile.tds_percentage || undefined,
        });
      } else {
        // Reset for create
        reset({
          name: '',
          description: undefined,
          entity_id: 0,
          vendor_id: 0,
          category_id: 0,
          currency_id: 0,
          prepaid_postpaid: undefined,
          tds_applicable: false,
          tds_percentage: undefined,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profile]);

  const loadMasterData = async () => {
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
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load master data',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMasterData(false);
    }
  };

  const onSubmit = async (data: InvoiceProfileFormData) => {
    try {
      const result = profile
        ? await updateInvoiceProfile(profile.id, data)
        : await createInvoiceProfile(data);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Invoice profile ${profile ? 'updated' : 'created'} successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${profile ? 'update' : 'create'} profile`,
        variant: 'destructive',
      });
    }
  };

  // Check if we have required master data
  const hasMissingMasterData =
    !isLoadingMasterData &&
    (masterData.entities.length === 0 ||
      masterData.vendors.length === 0 ||
      masterData.categories.length === 0 ||
      masterData.currencies.length === 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile ? 'Edit Invoice Profile' : 'Create Invoice Profile'}</DialogTitle>
          <DialogDescription>
            Configure an invoice profile with entity, vendor, category, and payment settings.
          </DialogDescription>
        </DialogHeader>

        {isLoadingMasterData ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground">Loading master data...</p>
          </div>
        ) : hasMissingMasterData ? (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive">Missing Required Master Data</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You need at least one active entity, vendor, category, and currency to create an
              invoice profile. Please create these first.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {masterData.entities.length === 0 && <li>• No active entities found</li>}
              {masterData.vendors.length === 0 && <li>• No active vendors found</li>}
              {masterData.categories.length === 0 && <li>• No active categories found</li>}
              {masterData.currencies.length === 0 && <li>• No active currencies found</li>}
            </ul>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">
                Profile Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., AWS Cloud Services, Office Supplies"
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description of this invoice profile"
                rows={2}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Entity Dropdown */}
            <div>
              <Label htmlFor="entity_id">
                Entity <span className="text-destructive">*</span>
              </Label>
              <Select
                id="entity_id"
                {...register('entity_id', { valueAsNumber: true })}
              >
                <option value="">Select entity</option>
                {masterData.entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </Select>
              {errors.entity_id && (
                <p className="mt-1 text-xs text-destructive">{errors.entity_id.message}</p>
              )}
            </div>

            {/* Vendor Dropdown */}
            <div>
              <Label htmlFor="vendor_id">
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select
                id="vendor_id"
                {...register('vendor_id', { valueAsNumber: true })}
              >
                <option value="">Select vendor</option>
                {masterData.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </Select>
              {errors.vendor_id && (
                <p className="mt-1 text-xs text-destructive">{errors.vendor_id.message}</p>
              )}
            </div>

            {/* Category Dropdown */}
            <div>
              <Label htmlFor="category_id">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                id="category_id"
                {...register('category_id', { valueAsNumber: true })}
              >
                <option value="">Select category</option>
                {masterData.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {errors.category_id && (
                <p className="mt-1 text-xs text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            {/* Currency Dropdown */}
            <div>
              <Label htmlFor="currency_id">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select
                id="currency_id"
                {...register('currency_id', { valueAsNumber: true })}
              >
                <option value="">Select currency</option>
                {masterData.currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </Select>
              {errors.currency_id && (
                <p className="mt-1 text-xs text-destructive">{errors.currency_id.message}</p>
              )}
            </div>

            {/* Prepaid/Postpaid Radio */}
            <div>
              <Label>Payment Type</Label>
              <div className="mt-2 space-y-2">
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
                <p className="mt-1 text-xs text-destructive">{errors.prepaid_postpaid.message}</p>
              )}
            </div>

            {/* TDS Applicable Checkbox */}
            <div className="flex items-center space-x-2">
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
              <Label htmlFor="tds_applicable" className="text-sm font-normal cursor-pointer">
                TDS Applicable (Tax Deducted at Source)
              </Label>
            </div>

            {/* TDS Percentage - Conditional */}
            {tdsApplicable && (
              <div>
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
                />
                {errors.tds_percentage && (
                  <p className="mt-1 text-xs text-destructive">{errors.tds_percentage.message}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter percentage (0-100). Example: 10 for 10%
                </p>
              </div>
            )}

            {/* Requirements Box */}
            <div className="rounded-md border border-border bg-muted p-3 text-xs">
              <p className="mb-1 font-semibold">Requirements:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Profile name must be unique (case-sensitive)</li>
                <li>• All foreign keys must reference active master data</li>
                <li>• TDS percentage required if TDS applicable</li>
                <li>• TDS percentage must be between 0 and 100</li>
              </ul>
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {!hasMissingMasterData && (
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || isLoadingMasterData}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {profile ? 'Updating...' : 'Creating...'}
                </>
              ) : profile ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
