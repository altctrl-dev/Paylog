/**
 * Role Change Confirmation Dialog
 *
 * Displays a confirmation prompt when changing a user's role, with detailed information
 * about the impact of the change. Particularly important when demoting from admin or
 * super_admin roles to prevent accidental privilege revocation.
 *
 * Sprint 11 Phase 4: Role & Permission Guards
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { UserRole, USER_ROLES } from '@/lib/types/user-management';

interface RoleChangeConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  currentRole: UserRole;
  newRole: UserRole;
  isLoading?: boolean;
}

// Role permission descriptions
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    'Full system access',
    'Manage all users and roles',
    'Manage master data',
    'Access all invoices',
    'Configure system settings',
  ],
  admin: [
    'Manage master data',
    'Approve/reject invoices',
    'Access all invoices',
    'View reports and analytics',
  ],
  standard_user: [
    'Create and edit own invoices',
    'Submit invoices for approval',
    'View own invoice history',
    'Request master data changes',
  ],
};

// Determine if role change is a demotion
function isDemotion(current: UserRole, newRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    super_admin: 3,
    admin: 2,
    standard_user: 1,
  };
  return hierarchy[current] > hierarchy[newRole];
}

export function RoleChangeConfirmationDialog({
  open,
  onClose,
  onConfirm,
  userName,
  currentRole,
  newRole,
  isLoading = false,
}: RoleChangeConfirmationDialogProps) {
  const isRoleDemotion = isDemotion(currentRole, newRole);
  const currentRoleLabel = USER_ROLES[currentRole];
  const newRoleLabel = USER_ROLES[newRole];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className={`rounded-full p-3 ${isRoleDemotion ? 'bg-warning/10' : 'bg-primary/10'}`}>
              <Shield className={`h-6 w-6 ${isRoleDemotion ? 'text-warning' : 'text-primary'}`} />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isRoleDemotion ? 'Confirm Role Demotion' : 'Confirm Role Change'}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="space-y-4 text-left">
            {isRoleDemotion && (
              <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                <p className="text-sm text-foreground">
                  <strong>Warning:</strong> You are about to reduce <strong>{userName}</strong>&apos;s privileges.
                  This action will immediately revoke access to certain system features.
                </p>
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                Role change for <strong>{userName}</strong>:
              </p>
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{currentRoleLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Current Role</div>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{newRoleLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">New Role</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-foreground">Will Lose Access To:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {ROLE_PERMISSIONS[currentRole]
                    .filter((perm) => !ROLE_PERMISSIONS[newRole].includes(perm))
                    .slice(0, 3)
                    .map((perm, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-destructive">�</span>
                        <span>{perm}</span>
                      </li>
                    ))}
                </ul>
              </div>

              <div className="rounded-md border border-success/20 bg-success/5 p-3">
                <p className="text-sm font-medium text-foreground">Will Retain Access To:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {ROLE_PERMISSIONS[newRole].slice(0, 3).map((perm, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-success"></span>
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This change will take effect immediately. The user may need to log in again to
              see the updated permissions.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant={isRoleDemotion ? 'destructive' : 'default'}
            disabled={isLoading}
          >
            {isLoading ? 'Changing Role...' : 'Confirm Role Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
