/**
 * Profile Form Panel (Level 2, 500px)
 *
 * Create/Edit invoice profile form extracted from dialog.
 * Part of Bug Fix: Replace modal with stacked panels (Sprint 11 Phase 4).
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import {
  getInvoiceProfiles,
  createInvoiceProfile,
  updateInvoiceProfile,
} from '@/app/actions/master-data';
import { getEntities } from '@/app/actions/admin/entities';
import { getVendors, getCategories } from '@/app/actions/master-data';
import {
  invoiceProfileFormSchema,
  type InvoiceProfileFormData,
} from '@/lib/validations/master-data';
import { useToast } from '@/hooks/use-toast';
import type { PanelConfig } from '@/types/panel';

interface ProfileFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  profileId?: number; // If provided = edit mode
  onSuccess: () => void; // Callback to refresh parent list
}

type MasterDataOptions = {
  entities: Array<{ id: number; name: string }>;
  vendors: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  currencies: Array<{ id: number; code: string; name: string }>;
};

export function ProfileFormPanel({
  config,
  onClose,
  profileId,
  onSuccess,
}: ProfileFormPanelProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(!!profileId);
  const [isLoadingMasterData, setIsLoadingMasterData] = React.useState(true);
  const [masterData, setMasterData] = React.useState<MasterDataOptions>({
    entities: [],
    vendors: [],
    categories: [],
    currencies: [],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<InvoiceProfileFormData>({
    resolver: zodResolver(invoiceProfileFormSchema),
    defaultValues: {
      name: '',
      description: undefined,
      entity_id: 0,
      vendor_id: 0,
      category_id: 0,
      currency_id: 0,
      prepaid_postpaid: undefined,
      billing_frequency: undefined,
      billing_frequency_unit: undefined,
      billing_frequency_value: undefined,
      tds_applicable: false,
      tds_percentage: undefined,
      visible_to_all: true,
    },
  });

  // Load master data (entities, vendors, categories, currencies)
  const loadMasterData = React.useCallback(async () => {
    setIsLoadingMasterData(true);
    try {
      const [entitiesRes, vendorsRes, categoriesRes, currenciesRes] =
        await Promise.all([
          getEntities({ is_active: true, per_page: 1000 }),
          getVendors({ is_active: true, per_page: 1000 }),
          getCategories({ is_active: true, per_page: 1000 }),
          fetch('/api/admin/currencies').then((r) => r.json()),
        ]);

      setMasterData({
        entities: entitiesRes.success ? entitiesRes.data.entities : [],
        vendors: vendorsRes.success ? vendorsRes.data.vendors : [],
        categories: categoriesRes.success ? categoriesRes.data.categories : [],
        currencies: currenciesRes.success
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

  // Load profile data if editing
  const loadProfile = React.useCallback(async () => {
    if (!profileId) return;

    setIsLoadingProfile(true);
    try {
      const result = await getInvoiceProfiles({ per_page: 1000 });
      if (result.success) {
        const profile = result.data.profiles.find((p) => p.id === profileId);
        if (profile) {
          reset({
            name: profile.name,
            description: profile.description || undefined,
            entity_id: profile.entity_id,
            vendor_id: profile.vendor_id,
            category_id: profile.category_id,
            currency_id: profile.currency_id,
            prepaid_postpaid: (profile.prepaid_postpaid as 'prepaid' | 'postpaid' | undefined) || undefined,
            billing_frequency: (profile.billing_frequency as 'monthly' | 'quarterly' | 'annual' | 'custom' | undefined) || undefined,
            billing_frequency_unit: (profile.billing_frequency_unit as 'days' | 'months' | undefined) || undefined,
            billing_frequency_value: profile.billing_frequency_value || undefined,
            tds_applicable: profile.tds_applicable,
            tds_percentage: profile.tds_percentage || undefined,
            visible_to_all: profile.visible_to_all ?? true,
          });
        } else {
          toast({
            title: 'Error',
            description: 'Profile not found',
            variant: 'destructive',
          });
          onClose();
        }
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [profileId, reset, toast, onClose]);

  React.useEffect(() => {
    loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only load master data once on mount

  React.useEffect(() => {
    if (profileId) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]); // Only load profile when profileId changes

  const onSubmit = async (data: InvoiceProfileFormData) => {
    setIsSubmitting(true);
    try {
      const result = profileId
        ? await updateInvoiceProfile(profileId, data)
        : await createInvoiceProfile(data);

      if (result.success) {
        toast({
          title: 'Success',
          description: profileId
            ? 'Invoice profile updated'
            : 'Invoice profile created',
        });
        onSuccess();
        onClose();
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
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tdsApplicable = watch('tds_applicable');
  const billingFrequency = watch('billing_frequency');

  // Check if required master data is missing
  const hasMissingMasterData =
    !isLoadingMasterData &&
    (masterData.entities.length === 0 ||
      masterData.vendors.length === 0 ||
      masterData.categories.length === 0 ||
      masterData.currencies.length === 0);

  const isFormDisabled = isSubmitting || isLoadingProfile || hasMissingMasterData;

  return (
    <PanelLevel
      config={config}
      title={profileId ? 'Edit Invoice Profile' : 'Create Invoice Profile'}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {!hasMissingMasterData && (
            <Button
              type="submit"
              form="profile-form"
              disabled={isFormDisabled}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {profileId ? 'Updating...' : 'Creating...'}
                </>
              ) : profileId ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          )}
        </>
      }
    >
      {isLoadingProfile ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="ml-2 text-sm text-muted-foreground">
            Loading profile...
          </p>
        </div>
      ) : isLoadingMasterData ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="ml-2 text-sm text-muted-foreground">
            Loading master data options...
          </p>
        </div>
      ) : hasMissingMasterData ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">
            Missing Required Master Data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You need at least one active entity, vendor, category, and currency
            to create an invoice profile. Please create these first.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {masterData.entities.length === 0 && <li>• No active entities found</li>}
            {masterData.vendors.length === 0 && <li>• No active vendors found</li>}
            {masterData.categories.length === 0 && <li>• No active categories found</li>}
            {masterData.currencies.length === 0 && <li>• No active currencies found</li>}
          </ul>
        </div>
      ) : (
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Profile Name */}
          <div>
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
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description of this invoice profile"
              rows={2}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Entity */}
          <div>
            <Label htmlFor="entity_id">
              Entity <span className="text-destructive">*</span>
            </Label>
            <Select
              id="entity_id"
              {...register('entity_id', { valueAsNumber: true })}
              className={errors.entity_id ? 'border-destructive' : ''}
            >
              <option value="">Select entity</option>
              {masterData.entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </Select>
            {errors.entity_id && (
              <p className="text-xs text-destructive">{errors.entity_id.message}</p>
            )}
          </div>

          {/* Vendor */}
          <div>
            <Label htmlFor="vendor_id">
              Vendor <span className="text-destructive">*</span>
            </Label>
            <Select
              id="vendor_id"
              {...register('vendor_id', { valueAsNumber: true })}
              className={errors.vendor_id ? 'border-destructive' : ''}
            >
              <option value="">Select vendor</option>
              {masterData.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
            {errors.vendor_id && (
              <p className="text-xs text-destructive">{errors.vendor_id.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category_id">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              id="category_id"
              {...register('category_id', { valueAsNumber: true })}
              className={errors.category_id ? 'border-destructive' : ''}
            >
              <option value="">Select category</option>
              {masterData.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {errors.category_id && (
              <p className="text-xs text-destructive">{errors.category_id.message}</p>
            )}
          </div>

          {/* Currency */}
          <div>
            <Label htmlFor="currency_id">
              Currency <span className="text-destructive">*</span>
            </Label>
            <Select
              id="currency_id"
              {...register('currency_id', { valueAsNumber: true })}
              className={errors.currency_id ? 'border-destructive' : ''}
            >
              <option value="">Select currency</option>
              {masterData.currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </Select>
            {errors.currency_id && (
              <p className="text-xs text-destructive">{errors.currency_id.message}</p>
            )}
          </div>

          {/* Billing Frequency */}
          <div>
            <Label htmlFor="billing_frequency">
              Billing Frequency <span className="text-destructive">*</span>
            </Label>
            <Select
              id="billing_frequency"
              {...register('billing_frequency')}
              className={errors.billing_frequency ? 'border-destructive' : ''}
              onChange={(e) => {
                const value = e.target.value as 'monthly' | 'quarterly' | 'annual' | 'custom' | '';
                if (value === '') {
                  // Clear all billing frequency fields when unselected
                  setValue('billing_frequency', undefined as unknown as 'monthly' | 'quarterly' | 'annual' | 'custom');
                  setValue('billing_frequency_unit', undefined);
                  setValue('billing_frequency_value', undefined);
                } else {
                  setValue('billing_frequency', value);
                  // Clear custom fields when switching away from "custom"
                  if (value !== 'custom') {
                    setValue('billing_frequency_unit', undefined);
                    setValue('billing_frequency_value', undefined);
                  }
                }
              }}
            >
              <option value="">Select frequency</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="custom">Custom</option>
            </Select>
            {errors.billing_frequency && (
              <p className="text-xs text-destructive">{errors.billing_frequency.message}</p>
            )}
          </div>

          {/* Custom Frequency Options (conditional) */}
          {billingFrequency === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billing_frequency_value">
                  Every <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billing_frequency_value"
                  type="number"
                  min="1"
                  {...register('billing_frequency_value', { valueAsNumber: true })}
                  placeholder="e.g., 30"
                  onWheel={(e) => e.currentTarget.blur()}
                  className={errors.billing_frequency_value ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <Label htmlFor="billing_frequency_unit">
                  Unit <span className="text-destructive">*</span>
                </Label>
                <Select
                  id="billing_frequency_unit"
                  {...register('billing_frequency_unit')}
                  className={errors.billing_frequency_unit ? 'border-destructive' : ''}
                >
                  <option value="">Select</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </Select>
              </div>
              {(errors.billing_frequency_value || errors.billing_frequency_unit) && (
                <p className="col-span-2 text-xs text-destructive">
                  {errors.billing_frequency_value?.message || errors.billing_frequency_unit?.message || 'Custom frequency requires unit and value'}
                </p>
              )}
            </div>
          )}

          {/* Prepaid/Postpaid */}
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
              <p className="text-xs text-destructive">{errors.prepaid_postpaid.message}</p>
            )}
          </div>

          {/* TDS Applicable */}
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

          {/* TDS Percentage (Conditional) */}
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
                onWheel={(e) => e.currentTarget.blur()} // Prevent scroll-to-increment
                className={errors.tds_percentage ? 'border-destructive' : ''}
              />
              {errors.tds_percentage && (
                <p className="text-xs text-destructive">
                  {errors.tds_percentage.message}
                </p>
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

          {/* Requirements Info */}
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
    </PanelLevel>
  );
}
