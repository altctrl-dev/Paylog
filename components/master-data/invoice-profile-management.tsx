/**
 * Invoice Profile Management Component
 *
 * Full CRUD UI for invoice profiles with 12-field schema.
 * Sprint 9B Phase 2 implementation.
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getInvoiceProfiles,
  archiveInvoiceProfile as deleteInvoiceProfile,
} from '@/app/actions/master-data';
import { useToast } from '@/hooks/use-toast';
import { usePanel } from '@/hooks/use-panel';

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
  billing_frequency: string | null;
  billing_frequency_unit: string | null;
  billing_frequency_value: number | null;
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InvoiceProfileManagement() {
  const [profiles, setProfiles] = useState<InvoiceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Panel state management - uses global panel system via PanelProvider
  const { openPanel, closeTopPanel, closeAllPanels } = usePanel();

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

  // Panel handlers
  const handleView = (profile: InvoiceProfile) => {
    closeAllPanels(); // Clear any existing panels
    openPanel(
      'profile-detail',
      {
        profileId: profile.id,
        onEdit: (id: number) => handleEdit(id),
        onDelete: () => {
          closeAllPanels();
          loadProfiles();
        },
      },
      { width: 350 }
    );
  };

  const handleEdit = (profileIdOrObject: number | InvoiceProfile) => {
    const profileId = typeof profileIdOrObject === 'number'
      ? profileIdOrObject
      : profileIdOrObject.id;

    openPanel(
      'profile-edit',
      {
        profileId,
        onSuccess: () => {
          closeTopPanel(); // Close form panel
          loadProfiles(); // Refresh list (and detail panel if open)
        },
      },
      { width: 500 }
    );
  };

  const handleCreate = () => {
    closeAllPanels(); // Clear any existing panels
    openPanel(
      'profile-form',
      {
        onSuccess: () => {
          closeTopPanel();
          loadProfiles();
        },
      },
      { width: 500 }
    );
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
          onView={handleView}
        />
      )}

      {/* Panels are rendered globally via PanelProvider */}
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
  onView: (profile: InvoiceProfile) => void;
}

function ProfileTable({ profiles, onEdit, onDelete, onView }: ProfileTableProps) {
  const formatTDS = (profile: InvoiceProfile) => {
    if (!profile.tds_applicable) return 'No TDS';
    return `${profile.tds_percentage || 0}%`;
  };

  const formatBillingFrequency = (profile: InvoiceProfile) => {
    if (!profile.billing_frequency) return '-';
    if (profile.billing_frequency === 'custom') {
      return `Every ${profile.billing_frequency_value} ${profile.billing_frequency_unit}`;
    }
    return profile.billing_frequency.charAt(0).toUpperCase() + profile.billing_frequency.slice(1);
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
            <th className="p-3 text-center text-sm font-semibold">Billing</th>
            <th className="p-3 text-center text-sm font-semibold">TDS</th>
            <th className="p-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr
              key={profile.id}
              className="cursor-pointer border-b transition-colors hover:bg-muted/50"
              onClick={() => onView(profile)}
            >
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
              <td className="p-3 text-center text-sm">{formatBillingFrequency(profile)}</td>
              <td className="p-3 text-center text-sm">{formatTDS(profile)}</td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(profile);
                    }}
                    className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    aria-label="Edit profile"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(profile.id);
                    }}
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
