/**
 * User Management Component
 *
 * Super Admin only feature for managing users, roles, and permissions.
 * Renders inline within the Admin Console page.
 *
 * Sprint 11 Phase 3: User Management UI
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { UserWithStats } from '@/lib/types/user-management';
import { listUsers } from '@/lib/actions/user-management';
import {
  UsersDataTable,
  UserPanelRenderer,
} from '@/components/users';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
   * Open create user form
   */
  const handleCreateUser = () => {
    setIsCreating(true);
  };

  /**
   * Select user for detail view
   */
  const handleSelectUser = (userId: number | null) => {
    setSelectedUserId(userId);
  };

  /**
   * Handle edit user action
   */
  const handleEditUser = (userId: number) => {
    setSelectedUserId(userId);
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

      {/* Stacked Panels */}
      <UserPanelRenderer
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        onRefreshData={handleRefreshData}
        showCreateForm={isCreating}
        onCloseCreateForm={() => setIsCreating(false)}
      />
    </div>
  );
}
