/**
 * Profile Detail Panel V3 (Template B - Simple Detail)
 *
 * V3 redesign with:
 * - Vertical action bar (right side)
 * - PanelSection for grouped content
 * - Clean footer with only Close button
 *
 * Width: MEDIUM (650px)
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { PanelLevel } from '@/components/panels/panel-level';
import { PanelSection } from '@/components/panels/shared';
import { PanelActionBar, type ActionBarAction } from '@/components/panels/shared';
import { PanelSummaryHeader } from '@/components/panels/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { getInvoiceProfiles, archiveInvoiceProfile } from '@/app/actions/master-data';
import { useToast } from '@/hooks/use-toast';
import { ProfileAccessManager } from '@/components/master-data/profile-access-manager';
import { ConfirmationDialog, ConfirmationContentRow } from '@/components/ui/confirmation-dialog';
import type { PanelConfig } from '@/types/panel';

interface ProfileDetailPanelV3Props {
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
  billing_frequency: string | null;
  billing_frequency_unit: string | null;
  billing_frequency_value: number | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
  visible_to_all: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

export function ProfileDetailPanelV3({
  config,
  onClose,
  profileId,
  onEdit,
  onDelete,
}: ProfileDetailPanelV3Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

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
  }, [profileId]);

  const handleDelete = () => {
    if (!profile) return;

    if (profile.invoiceCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This profile has ${profile.invoiceCount} invoice(s). Cannot delete profiles with invoices.`,
        variant: 'destructive',
      });
      return;
    }

    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!profile) return;

    setIsDeleting(true);
    try {
      const result = await archiveInvoiceProfile(profile.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Profile deleted',
        });
        setShowDeleteDialog(false);
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

  // ============================================================================
  // ACTION BAR CONFIG
  // ============================================================================

  const primaryActions: ActionBarAction[] = profile
    ? [
        {
          id: 'edit',
          icon: <Edit2 />,
          label: 'Edit Profile',
          onClick: () => onEdit(profile.id),
          disabled: isDeleting,
        },
      ]
    : [];

  const secondaryActions: ActionBarAction[] = profile
    ? [
        {
          id: 'delete',
          icon: <Trash2 />,
          label:
            profile.invoiceCount > 0
              ? `Cannot delete (${profile.invoiceCount} invoices)`
              : 'Delete Profile',
          onClick: handleDelete,
          disabled: isDeleting || profile.invoiceCount > 0,
          destructive: true,
        },
      ]
    : [];

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <div className="flex w-full justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PanelLevel>
    );
  }

  if (!profile) {
    return null;
  }

  // Format billing frequency
  const billingFrequency =
    profile.billing_frequency === 'custom'
      ? `Every ${profile.billing_frequency_value} ${profile.billing_frequency_unit}`
      : profile.billing_frequency
        ? profile.billing_frequency.charAt(0).toUpperCase() +
          profile.billing_frequency.slice(1)
        : '-';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PanelLevel
      config={config}
      title={profile.name}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex h-full">
        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <PanelSummaryHeader
              title={profile.name}
              subtitle={profile.description || undefined}
              badges={[
                {
                  label: profile.visible_to_all ? 'All Users' : 'Restricted',
                  variant: profile.visible_to_all ? 'secondary' : 'outline',
                },
                ...(profile.tds_applicable
                  ? [
                      {
                        label: `${profile.tds_percentage}% TDS`,
                        variant: 'default' as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {/* Content Sections */}
          <div className="p-6 space-y-6">
            {/* Core Details */}
            <PanelSection title="Core Details">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Entity
                  </label>
                  <p className="mt-1 text-sm font-medium">{profile.entity.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Vendor
                  </label>
                  <p className="mt-1 text-sm font-medium">{profile.vendor.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Category
                  </label>
                  <p className="mt-1 text-sm font-medium">{profile.category.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Currency
                  </label>
                  <p className="mt-1 text-sm font-medium">
                    {profile.currency.code} - {profile.currency.name}
                  </p>
                </div>
              </div>
            </PanelSection>

            {/* Billing Details */}
            <PanelSection title="Billing">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Frequency
                  </label>
                  <p className="mt-1 text-sm font-medium">{billingFrequency}</p>
                </div>
                {profile.prepaid_postpaid && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Payment Type
                    </label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {profile.prepaid_postpaid === 'prepaid' ? 'Prepaid' : 'Postpaid'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </PanelSection>

            {/* TDS Section */}
            <PanelSection title="Tax Deduction (TDS)">
              {profile.tds_applicable ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default">{profile.tds_percentage}%</Badge>
                  <span className="text-sm text-muted-foreground">TDS Applicable</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not applicable</p>
              )}
            </PanelSection>

            {/* Usage Stats */}
            <PanelSection title="Usage">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{profile.invoiceCount}</span>
                <span className="text-sm text-muted-foreground">
                  invoice{profile.invoiceCount !== 1 ? 's' : ''} using this profile
                </span>
              </div>
            </PanelSection>

            {/* Access Management - Super Admin only */}
            {session?.user?.role === 'super_admin' && (
              <PanelSection title="Access Management">
                <ProfileAccessManager
                  profileId={profile.id}
                  profileName={profile.name}
                  visibleToAll={profile.visible_to_all}
                />
              </PanelSection>
            )}

            {/* Timestamps */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="block uppercase tracking-wide">Created</span>
                  <span className="font-medium text-foreground">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block uppercase tracking-wide">Updated</span>
                  <span className="font-medium text-foreground">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar (right side) */}
        <div className="border-l bg-muted/20">
          <PanelActionBar
            primaryActions={primaryActions}
            secondaryActions={secondaryActions}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Profile"
        description="Are you sure you want to delete this profile? This action cannot be undone."
        variant="destructive"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      >
        {profile && (
          <div className="space-y-2">
            <ConfirmationContentRow label="Profile" value={profile.name} />
            <ConfirmationContentRow label="Vendor" value={profile.vendor.name} />
          </div>
        )}
      </ConfirmationDialog>
    </PanelLevel>
  );
}

export default ProfileDetailPanelV3;
