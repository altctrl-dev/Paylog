'use client';

import { useState, useEffect } from 'react';
import { createUser, updateUser, getUserById, validateRoleChange } from '@/lib/actions/user-management';
import type { UserRole } from '@/lib/types/user-management';
import { RoleSelector, RoleChangeConfirmationDialog, LastSuperAdminWarningDialog, UserCreatedConfirmationDialog } from '@/components/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Loader2 } from 'lucide-react';

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
  const [showUserCreatedConfirmation, setShowUserCreatedConfirmation] = useState(false);
  const [createdUserPassword, setCreatedUserPassword] = useState<string>('');
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

    const result = userId
      ? await updateUser(userId, formData)
      : await createUser(formData);

    if (result.success) {
      // For create mode, message contains the temporary password
      // Format: "User John Doe created successfully. Temporary password: xyz123"
      if (!userId && result.message) {
        const passwordMatch = result.message.match(/Temporary password: (.+)$/);
        if (passwordMatch) {
          // Show password confirmation dialog instead of toasts
          setCreatedUserPassword(passwordMatch[1]);
          setShowUserCreatedConfirmation(true);
          setIsSaving(false);
          onSuccess(); // Refresh the user list
          return; // Don't close the panel yet - dialog will close it
        } else {
          toast({
            title: 'Success',
            description: result.message,
          });
        }
      } else {
        toast({
          title: 'Success',
          description: result.message,
        });
      }

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

    setIsSaving(false);
  }

  function handleConfirmRoleChange() {
    setShowRoleChangeConfirmation(false);
    performSave();
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] border-l bg-background shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">
          {userId ? 'Edit User' : 'Create User'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form - Scrollable */}
      {isLoadingUser ? (
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="overflow-y-auto h-[calc(100vh-64px)] p-4">
          <div className="space-y-4">
            {/* Full Name Field */}
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

            {/* Password Info (Create Mode Only) */}
            {!userId && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">Password Generation</p>
                <p className="text-muted-foreground">
                  A secure temporary password will be automatically generated and displayed after
                  creation.
                </p>
              </div>
            )}

            {/* Form Errors */}
            {errors.form && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {errors.form}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {userId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  userId ? 'Update User' : 'Create User'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
            </div>
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

      {/* User Created Confirmation Dialog */}
      <UserCreatedConfirmationDialog
        open={showUserCreatedConfirmation}
        onClose={() => {
          setShowUserCreatedConfirmation(false);
          setCreatedUserPassword('');
          onClose(); // Close the form panel after acknowledging
        }}
        userName={formData.full_name}
        userEmail={formData.email}
        temporaryPassword={createdUserPassword}
      />
    </div>
  );
}
