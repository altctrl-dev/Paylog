'use client';

import { useState, useCallback } from 'react';
import type { UserWithStats } from '@/lib/types/user-management';
import { listUsers, deleteUser, restoreUser } from '@/lib/actions/user-management';
import { resendInvite } from '@/app/actions/invites';
import { UsersDataTable } from '@/components/users';
import { PasswordResetDialog } from '@/components/users/password-reset-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { useToast } from '@/hooks/use-toast';
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

/**
 * Users Page Client Component
 * Sprint 11 Phase 4: Unified User Management
 *
 * Features:
 * - Single unified list showing all user statuses (pending, active, deactivated, deleted)
 * - Status badges with filtering
 * - Smart delete: Hard delete (0 activities) vs Soft delete (has activities)
 * - Restore functionality for soft-deleted users
 * - User detail panel (stacked overlay via global panel system)
 * - User form panel (create/edit)
 * - Password reset dialog
 * - Automatic data refresh after mutations
 */

interface UsersPageClientProps {
  initialUsers: UserWithStats[];
}

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  // State management
  const [users, setUsers] = useState<UserWithStats[]>(initialUsers);

  // Password reset dialog state
  const [passwordResetUserId, setPasswordResetUserId] = useState<number | null>(null);
  const [passwordResetUserName, setPasswordResetUserName] = useState<string>('');

  // Delete confirmation dialog state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Panel state management - uses global panel system via PanelProvider
  const { openPanel, closeTopPanel, closeAllPanels } = usePanel();
  const { toast } = useToast();

  /**
   * Refresh users data after mutations
   * Called by child components after create/update/deactivate/reactivate
   */
  const handleRefreshData = useCallback(async () => {
    const result = await listUsers({
      page: 1,
      pageSize: 50,
    });

    if (result.success) {
      setUsers(result.data.users);
    }
  }, []);

  /**
   * Open create user form via global panel system
   * Triggered by "Create User" button
   */
  const handleCreateUser = () => {
    closeAllPanels();
    openPanel(
      'user-form',
      {
        onSuccess: () => {
          closeTopPanel();
          handleRefreshData();
        },
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  };

  /**
   * Select user for detail view via global panel system
   * Triggered by clicking a row in the data table
   */
  const handleSelectUser = (userId: number | null) => {
    if (userId === null) {
      closeAllPanels();
      return;
    }

    closeAllPanels();
    openPanel(
      'user-detail',
      {
        userId,
        onEdit: () => handleEditUser(userId),
        onPasswordReset: () => {
          // Find user name for password reset dialog
          const user = users.find(u => u.id === userId);
          if (user) {
            setPasswordResetUserId(userId);
            setPasswordResetUserName(user.full_name);
          }
        },
        onResendInvite: () => handleResendInvite(userId),
        onDeleteUser: () => handleDeleteUser(userId),
        onRestoreUser: () => handleRestoreUser(userId),
        onRefresh: handleRefreshData,
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  };

  /**
   * Handle edit user action via global panel system
   * Triggered by clicking the edit button in the data table
   */
  const handleEditUser = (userId: number) => {
    openPanel(
      'user-edit',
      {
        userId,
        onSuccess: () => {
          closeTopPanel();
          handleRefreshData();
        },
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  };

  /**
   * Handle resend invite action
   */
  const handleResendInvite = async (userId: number) => {
    const result = await resendInvite(userId);

    if (result.success) {
      toast({
        title: 'Invite Resent',
        description: 'A new invitation email has been sent.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to resend invite',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle delete user action - shows confirmation dialog
   */
  const handleDeleteUser = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setDeleteConfirmUser(user);
    }
  };

  /**
   * Confirm and execute delete
   */
  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;

    setIsDeleting(true);
    const result = await deleteUser(deleteConfirmUser.id);

    if (result.success) {
      const action = result.data?.deleteType === 'hard' ? 'permanently deleted' : 'soft deleted';
      toast({
        title: 'User Deleted',
        description: `${deleteConfirmUser.full_name} has been ${action}.`,
      });
      handleRefreshData();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete user',
        variant: 'destructive',
      });
    }

    setIsDeleting(false);
    setDeleteConfirmUser(null);
  };

  /**
   * Handle restore user action
   */
  const handleRestoreUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    const result = await restoreUser(userId);

    if (result.success) {
      toast({
        title: 'User Restored',
        description: `${user?.full_name || 'User'} has been restored.`,
      });
      handleRefreshData();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to restore user',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage users, roles, and permissions
            </p>
          </div>
          <Button onClick={handleCreateUser}>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Main Content - Unified User List */}
      <div className="flex-1 overflow-auto p-6">
        <UsersDataTable
          initialUsers={users}
          onSelectUser={handleSelectUser}
          onEditUser={handleEditUser}
          onResendInvite={handleResendInvite}
          onDeleteUser={handleDeleteUser}
          onRestoreUser={handleRestoreUser}
        />
      </div>

      {/* Panels are rendered globally via PanelProvider */}

      {/* Password Reset Dialog - Renders as modal on top of panels */}
      <PasswordResetDialog
        userId={passwordResetUserId || 0}
        userName={passwordResetUserName}
        open={passwordResetUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordResetUserId(null);
            setPasswordResetUserName('');
          }
        }}
        onSuccess={handleRefreshData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmUser && (
                <>
                  {deleteConfirmUser.invoice_count > 0 ? (
                    <>
                      <strong>{deleteConfirmUser.full_name}</strong> has {deleteConfirmUser.invoice_count} invoice(s)
                      associated with their account. They will be <strong>soft deleted</strong> and can be restored later.
                    </>
                  ) : (
                    <>
                      <strong>{deleteConfirmUser.full_name}</strong> has no associated data.
                      They will be <strong>permanently deleted</strong>. This action cannot be undone.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
