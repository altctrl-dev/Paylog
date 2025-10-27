'use client';

import { useState, useCallback } from 'react';
import type { UserWithStats } from '@/lib/types/user-management';
import { listUsers } from '@/lib/actions/user-management';
import {
  UsersDataTable,
  UserPanelRenderer,
} from '@/components/users';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
 * - User detail panel (stacked overlay)
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

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
   * Open create user form
   * Triggered by "Create User" button
   */
  const handleCreateUser = () => {
    // Set selectedUserId to -1 to trigger create mode
    setSelectedUserId(-1);
  };

  /**
   * Select user for detail view
   * Triggered by clicking a row in the data table
   */
  const handleSelectUser = (userId: number | null) => {
    setSelectedUserId(userId);
  };

  /**
   * Handle edit user action
   * Triggered by clicking the edit button in the data table
   */
  const handleEditUser = (userId: number) => {
    setSelectedUserId(userId);
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

      {/* Stacked Panels */}
      <UserPanelRenderer
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        onRefreshData={handleRefreshData}
      />
    </div>
  );
}
