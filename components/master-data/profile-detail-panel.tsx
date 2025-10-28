/**
 * Profile Detail Panel (Level 1, 350px)
 *
 * Read-only view of invoice profile with Edit/Delete actions.
 * Part of Bug Fix: Replace modal with stacked panels (Sprint 11 Phase 4).
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { getInvoiceProfiles, archiveInvoiceProfile } from '@/app/actions/master-data';
import { useToast } from '@/hooks/use-toast';
import type { PanelConfig } from '@/types/panel';

interface ProfileDetailPanelProps {
  config: PanelConfig;
  onClose: () => void;
  profileId: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

type Profile = {
  id: number;
  name: string;
  description: string | null;
  entity: { name: string };
  vendor: { name: string };
  category: { name: string };
  currency: { code: string; name: string };
  prepaid_postpaid: string | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  visible_to_all: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

export function ProfileDetailPanel({
  config,
  onClose,
  profileId,
  onEdit,
  onDelete,
}: ProfileDetailPanelProps) {
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getInvoiceProfiles({ per_page: 1000 });
      if (result.success) {
        const found = result.data.profiles.find((p) => p.id === profileId);
        if (found) {
          setProfile(found);
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
        description: 'Failed to load profile details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [profileId, toast, onClose]);

  React.useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]); // Only re-fetch when profileId changes

  const handleDelete = async () => {
    if (!profile) return;

    if (profile.invoiceCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This profile has ${profile.invoiceCount} invoice(s). Cannot delete profiles with invoices.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await archiveInvoiceProfile(profile.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Profile deleted',
        });
        onDelete(profile.id);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PanelLevel>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <PanelLevel
      config={config}
      title={profile.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(profile.id)}
            disabled={isDeleting}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || profile.invoiceCount > 0}
            title={
              profile.invoiceCount > 0
                ? `Cannot delete profile with ${profile.invoiceCount} invoice(s)`
                : undefined
            }
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Description */}
        {profile.description && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <p className="mt-1 text-sm">{profile.description}</p>
          </div>
        )}

        {/* Entity */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Entity
          </label>
          <p className="mt-1 text-sm font-medium">{profile.entity.name}</p>
        </div>

        {/* Vendor */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Vendor
          </label>
          <p className="mt-1 text-sm font-medium">{profile.vendor.name}</p>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <p className="mt-1 text-sm font-medium">{profile.category.name}</p>
        </div>

        {/* Currency */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Currency
          </label>
          <p className="mt-1 text-sm font-medium">
            {profile.currency.code} - {profile.currency.name}
          </p>
        </div>

        {/* Payment Type */}
        {profile.prepaid_postpaid && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Payment Type
            </label>
            <Badge variant="outline" className="mt-1">
              {profile.prepaid_postpaid === 'prepaid' ? 'Prepaid' : 'Postpaid'}
            </Badge>
          </div>
        )}

        {/* TDS */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            TDS (Tax Deducted at Source)
          </label>
          {profile.tds_applicable ? (
            <p className="mt-1 text-sm">
              <Badge variant="default">
                {profile.tds_percentage}% TDS Applicable
              </Badge>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Not applicable</p>
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Visibility
          </label>
          <Badge variant="outline" className="mt-1">
            {profile.visible_to_all ? 'All Users' : 'Restricted'}
          </Badge>
        </div>

        {/* Invoice Count */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Invoices Using This Profile
          </label>
          <p className="mt-1 text-sm font-medium">{profile.invoiceCount}</p>
        </div>

        {/* Timestamps */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="block">Created</span>
              <span className="font-medium">
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="block">Updated</span>
              <span className="font-medium">
                {new Date(profile.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PanelLevel>
  );
}
