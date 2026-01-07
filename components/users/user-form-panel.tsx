'use client';

import { useState, useEffect } from 'react';
import { updateUser, getUserById, validateRoleChange } from '@/lib/actions/user-management';
import { createInvite } from '@/app/actions/invites';
import type { UserRole } from '@/lib/types/user-management';
import { RoleSelector, RoleChangeConfirmationDialog, LastSuperAdminWarningDialog } from '@/components/users';
import { InviteCreatedDialog } from '@/components/users/invite-created-dialog';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PanelConfig } from '@/types/panel';
import { PANEL_Z_INDEX } from '@/types/panel';

interface UserFormPanelProps {
  userId?: number; // undefined = create mode, number = edit mode
  onClose: () => void;
  onSuccess: () => void;
}

export function UserFormPanel({ userId, onClose, onSuccess }: UserFormPanelProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'standard_user' as UserRole,
  });
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [showRoleChangeConfirmation, setShowRoleChangeConfirmation] = useState(false);
  const [showLastSuperAdminWarning, setShowLastSuperAdminWarning] = useState(false);
  const [showInviteCreatedDialog, setShowInviteCreatedDialog] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string>('');
  const [errors, setErrors] = useState<{
    email?: string;
    form?: string;
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (userId !== undefined) {
      async function loadUser() {
        setIsLoadingUser(true);
        // TypeScript: userId is guaranteed to be number here due to the if check
        const result = await getUserById(userId as number);

        if (result.success) {
          const role = result.data.role as UserRole;
          setFormData({
            full_name: result.data.full_name,
            email: result.data.email,
            role,
          });
          setOriginalRole(role); // Save original role for comparison
        } else {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
          onClose();
        }

        setIsLoadingUser(false);
      }

      loadUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors on change
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Check for role change in edit mode
    if (userId && originalRole && formData.role !== originalRole) {
      // Validate role change
      const validation = await validateRoleChange(userId, formData.role);

      if (validation.success && !validation.data.can_change) {
        // Last super admin - show warning dialog
        setShowLastSuperAdminWarning(true);
        return;
      }

      // Role change is allowed - show confirmation dialog
      setShowRoleChangeConfirmation(true);
      return;
    }

    // No role change or create mode - proceed directly
    await performSave();
  }

  async function performSave() {
    setIsSaving(true);

    if (userId) {
      // Edit mode - update existing user
      const result = await updateUser(userId, formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        onSuccess();
        onClose();
      } else {
        setErrors({ form: result.error });
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } else {
      // Create mode - send invite instead of creating user directly
      const result = await createInvite(formData.email, formData.role);

      if (result.success && result.inviteUrl) {
        // Show invite created dialog with the invite URL
        setCreatedInviteUrl(result.inviteUrl);
        setShowInviteCreatedDialog(true);
        setIsSaving(false);
        return; // Don't close the panel yet - dialog will close it
      } else {
        setErrors({ form: result.error });
        toast({
          title: 'Error',
          description: result.error || 'Failed to create invite',
          variant: 'destructive',
        });
      }
    }

    setIsSaving(false);
  }

  function handleConfirmRoleChange() {
    setShowRoleChangeConfirmation(false);
    performSave();
  }

  // Create a minimal config for PanelLevel - these panels are used standalone
  // without the panel store system, so we construct a config internally
  // Use level 2 for form panels (500px width, higher z-index)
  const panelConfig: PanelConfig = {
    id: userId ? `user-edit-${userId}` : 'user-create',
    type: userId ? 'user-edit' : 'user-create',
    props: userId ? { userId } : {},
    level: 2,
    zIndex: PANEL_Z_INDEX.LEVEL_2,
    width: 500,
  };

  // Footer with action buttons
  const footerContent = (
    <div className="flex gap-2 w-full">
      <Button
        type="submit"
        form="user-form"
        disabled={isSaving}
        className="flex-1"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {userId ? 'Updating...' : 'Sending Invite...'}
          </>
        ) : (
          userId ? 'Update User' : 'Send Invite'
        )}
      </Button>
      <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
    </div>
  );

  return (
    <PanelLevel
      config={panelConfig}
      title={userId ? 'Edit User' : 'Invite User'}
      onClose={onClose}
      footer={footerContent}
    >
      {/* Form Content */}
      {isLoadingUser ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form id="user-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Full Name Field (Edit Mode Only) */}
            {userId && (
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                disabled={!!userId} // Can't change email in edit mode
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            {/* Role Field */}
            <div>
              <Label htmlFor="role">Role *</Label>
              <RoleSelector
                value={formData.role}
                onChange={(role) => setFormData({ ...formData, role })}
              />
            </div>

            {/* Invite Info (Create Mode Only) */}
            {!userId && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">How it works</p>
                <p className="text-muted-foreground">
                  An invitation email will be sent to this address. The user will sign in with Microsoft
                  and enter their name to complete registration.
                </p>
              </div>
            )}

            {/* Form Errors */}
            {errors.form && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {errors.form}
              </div>
            )}
          </div>
        </form>
      )}

      {/* Role Change Confirmation Dialog */}
      {originalRole && (
        <RoleChangeConfirmationDialog
          open={showRoleChangeConfirmation}
          onClose={() => setShowRoleChangeConfirmation(false)}
          onConfirm={handleConfirmRoleChange}
          userName={formData.full_name}
          currentRole={originalRole}
          newRole={formData.role}
          isLoading={isSaving}
        />
      )}

      {/* Last Super Admin Warning Dialog */}
      <LastSuperAdminWarningDialog
        open={showLastSuperAdminWarning}
        onClose={() => setShowLastSuperAdminWarning(false)}
        action="demote"
        userName={formData.full_name}
      />

      {/* Invite Created Confirmation Dialog */}
      <InviteCreatedDialog
        open={showInviteCreatedDialog}
        onClose={() => {
          setShowInviteCreatedDialog(false);
          setCreatedInviteUrl('');
          onSuccess(); // Refresh the list after user acknowledges
          onClose(); // Close the form panel after acknowledging
        }}
        email={formData.email}
        role={formData.role}
        inviteUrl={createdInviteUrl}
      />
    </PanelLevel>
  );
}
