'use client';

import { useState, useCallback } from 'react';
import type { UserWithStats } from '@/lib/types/user-management';
import { listUsers } from '@/lib/actions/user-management';
import { UsersDataTable } from '@/components/users';
import { PasswordResetDialog } from '@/components/users/password-reset-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';

/**
 * Users Page Client Component
 * Sprint 11 Phase 3 Sub-Phase 6: Admin Users Page
 *
 * Purpose:
 * - Interactive UI for user management
 * - Integrates all components from Sub-Phases 1-5
 * - Manages state for selected user and data refresh
 *
 * Features:
 * - Data table with search/filter/sort
 * - User detail panel (stacked overlay via global panel system)
 * - User form panel (create/edit)
 * - Password reset dialog
 * - Automatic data refresh after mutations
 *
 * Updated: Uses global panel system via PanelProvider
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

  // Panel state management - uses global panel system via PanelProvider
  const { openPanel, closeTopPanel, closeAllPanels } = usePanel();

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
        onRefresh: handleRefreshData,
      },
      { width: PANEL_WIDTH.SMALL }
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
            Create User
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <UsersDataTable
          initialUsers={users}
          onSelectUser={handleSelectUser}
          onEditUser={handleEditUser}
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
    </div>
  );
}
