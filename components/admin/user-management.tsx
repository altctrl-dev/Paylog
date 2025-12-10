/**
 * User Management Component
 *
 * Super Admin only feature for managing users, roles, and permissions.
 * Renders inline within the Admin Console page.
 *
 * Sprint 11 Phase 3: User Management UI
 * Updated: Uses global panel system via PanelProvider
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { UserWithStats } from '@/lib/types/user-management';
import { listUsers } from '@/lib/actions/user-management';
import { UsersDataTable } from '@/components/users';
import { PasswordResetDialog } from '@/components/users/password-reset-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password reset dialog state
  const [passwordResetUserId, setPasswordResetUserId] = useState<number | null>(null);
  const [passwordResetUserName, setPasswordResetUserName] = useState<string>('');

  // Panel state management - uses global panel system via PanelProvider
  const { openPanel, closeTopPanel, closeAllPanels } = usePanel();

  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      const result = await listUsers({ page: 1, pageSize: 50 });

      if (result.success) {
        setUsers(result.data.users);
        setError(null);
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    fetchUsers();
  }, []);

  /**
   * Refresh users data after mutations
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
        onRefresh: handleRefreshData,
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  };

  /**
   * Handle edit user action via global panel system
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Error loading users</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Users Table */}
      <UsersDataTable
        initialUsers={users}
        onSelectUser={handleSelectUser}
        onEditUser={handleEditUser}
      />

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
    </div>
  );
}
