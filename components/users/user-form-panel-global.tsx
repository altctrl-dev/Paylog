/**
 * User Form Panel (Global)
 *
 * A version of UserFormPanel that works with the global panel system.
 * Accepts external PanelConfig instead of creating its own.
 *
 * Create mode: Sends invite (email + role only)
 * Edit mode: Updates user details (name, role)
 */

'use client';

import { useState, useEffect } from 'react';
import { updateUser, getUserById, validateRoleChange, deactivateUser, reactivateUser } from '@/lib/actions/user-management';
import { createInvite } from '@/app/actions/invites';
import type { UserRole } from '@/lib/types/user-management';
import { RoleSelector, RoleChangeConfirmationDialog, LastSuperAdminWarningDialog } from '@/components/users';
import { InviteCreatedDialog } from '@/components/users/invite-created-dialog';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Calendar, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PanelConfig } from '@/types/panel';

interface UserFormPanelGlobalProps {
  config: PanelConfig;
  userId?: number; // undefined = create mode, number = edit mode
  onClose: () => void;
  onSuccess: () => void;
}

export function UserFormPanelGlobal({ config, userId, onClose, onSuccess }: UserFormPanelGlobalProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'standard_user' as UserRole,
  });
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const [userDetails, setUserDetails] = useState<{
    created_at: Date | null;
    is_active: boolean;
    has_password: boolean;
  }>({ created_at: null, is_active: true, has_password: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showRoleChangeConfirmation, setShowRoleChangeConfirmation] = useState(false);
  const [showLastSuperAdminWarning, setShowLastSuperAdminWarning] = useState(false);
  const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);
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
          setUserDetails({
            created_at: result.data.created_at,
            is_active: result.data.is_active,
            // Super admins can have emergency passwords
            has_password: role === 'super_admin',
          });
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

  async function handleToggleUserStatus() {
    if (!userId) return;

    setIsTogglingStatus(true);
    setShowDeactivateConfirmation(false);

    const result = userDetails.is_active
      ? await deactivateUser(userId)
      : await reactivateUser(userId);

    if (result.success) {
      const newStatus = !userDetails.is_active;
      setUserDetails((prev) => ({ ...prev, is_active: newStatus }));
      toast({
        title: 'Success',
        description: `User ${newStatus ? 'reactivated' : 'deactivated'} successfully`,
      });
      onSuccess(); // Refresh the user list
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }

    setIsTogglingStatus(false);
  }

  // Footer with action buttons
  const footerContent = (
    <div className="flex gap-2 w-full">
      <Button
        type="submit"
        form="user-form-global"
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
      config={config}
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
        <form id="user-form-global" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Full Name Field - Only in Edit mode */}
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
                readOnly={!!userId}
                disabled={!!userId}
                placeholder="john@example.com"
                className={userId ? 'bg-muted' : ''}
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

            {/* Authentication Info (Edit Mode Only) */}
            {userId && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Authentication
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sign-in method</span>
                    <span className="font-medium">Microsoft Account</span>
                  </div>
                  {userDetails.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Member since</span>
                      <span className="font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(userDetails.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {formData.role === 'super_admin' && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Emergency access</span>
                      <span className="font-medium text-amber-600">Available</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Actions (Edit Mode Only) */}
            {userId && (
              <div className="p-4 border border-dashed rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Account Actions
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {userDetails.is_active ? 'Deactivate Account' : 'Reactivate Account'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userDetails.is_active
                        ? 'User will no longer be able to sign in'
                        : 'Restore user access to the system'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={userDetails.is_active ? 'destructive' : 'default'}
                    size="sm"
                    disabled={isTogglingStatus}
                    onClick={() => {
                      if (userDetails.is_active) {
                        setShowDeactivateConfirmation(true);
                      } else {
                        handleToggleUserStatus();
                      }
                    }}
                  >
                    {isTogglingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : userDetails.is_active ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Reactivate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Invite Info (Create Mode Only) */}
            {!userId && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">How it works</p>
                <p className="text-muted-foreground">
                  An invite link will be generated and sent to this email. The user will enter their
                  name and sign in with Microsoft to activate their account. The link expires in 48 hours.
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

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateConfirmation} onOpenChange={setShowDeactivateConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {formData.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the user from signing in. They will not be able to access the system
              until their account is reactivated. This action can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleUserStatus}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Created Dialog */}
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
