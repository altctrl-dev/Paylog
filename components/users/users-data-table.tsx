'use client';

import { useState, useMemo } from 'react';
import type { UserWithStats } from '@/lib/types/user-management';
import { UserStatusBadge } from '@/components/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Search } from 'lucide-react';

interface UsersDataTableProps {
  initialUsers: UserWithStats[];
  onSelectUser: (userId: number) => void;
  onEditUser: (userId: number) => void;
}

type SortField = 'full_name' | 'email' | 'role' | 'last_activity_at';
type SortOrder = 'asc' | 'desc';

/**
 * Helper function to format relative time strings for last activity
 * Returns human-readable relative time (e.g., "2 hours ago", "Never")
 */
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';

  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60)
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return dateObj.toLocaleDateString();
}

/**
 * Helper function to map database role values to display labels
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'standard_user':
      return 'Standard User';
    default:
      return role;
  }
}

/**
 * UsersDataTable Component
 *
 * Main table component for user management with search, filters, and sorting.
 * Uses native HTML table elements with Tailwind styling for consistency.
 *
 * Features:
 * - Search by name/email
 * - Filter by role and status
 * - Sort by name, email, role, or last activity
 * - Click row to view details
 * - Edit button with event stop propagation
 */
export function UsersDataTable({
  initialUsers,
  onSelectUser,
  onEditUser,
}: UsersDataTableProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  /**
   * Handle sort column click
   * Toggle order if same field, otherwise reset to ascending
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  /**
   * Filter users based on search query, role, and status
   * Memoized for performance optimization
   */
  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      // Search filter (name and email)
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);

      // Role filter
      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter;

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active' && !user.is_active) matchesStatus = false;
      if (statusFilter === 'inactive' && user.is_active)
        matchesStatus = false;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [initialUsers, searchQuery, roleFilter, statusFilter]);

  /**
   * Sort filtered users by selected field and order
   * Memoized for performance optimization
   */
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'full_name':
          aVal = a.full_name.toLowerCase();
          bVal = b.full_name.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'role':
          aVal = a.role;
          bVal = b.role;
          break;
        case 'last_activity_at':
          // Convert to timestamp for proper numeric comparison
          aVal = a.last_activity_at ? a.last_activity_at.getTime() : 0;
          bVal = b.last_activity_at ? b.last_activity_at.getTime() : 0;
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role Filter - Native Select */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="standard_user">Standard User</option>
        </select>

        {/* Status Filter - Native Select */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table - Native HTML with Tailwind */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
              <th
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                onClick={() => handleSort('full_name')}
              >
                Name{' '}
                {sortField === 'full_name' &&
                  (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                onClick={() => handleSort('email')}
              >
                Email{' '}
                {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Role
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Status
              </th>
              <th
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                onClick={() => handleSort('last_activity_at')}
              >
                Last Activity{' '}
                {sortField === 'last_activity_at' &&
                  (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Invoices
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-24 text-center">
                  No users found.
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectUser(user.id)}
                >
                  <td className="p-4 align-middle font-medium">
                    {user.full_name}
                  </td>
                  <td className="p-4 align-middle">{user.email}</td>
                  <td className="p-4 align-middle">{getRoleLabel(user.role)}</td>
                  <td className="p-4 align-middle">
                    <UserStatusBadge
                      status={user.is_active ? 'active' : 'inactive'}
                    />
                  </td>
                  <td className="p-4 align-middle text-muted-foreground">
                    {formatRelativeTime(user.last_activity_at)}
                  </td>
                  <td className="p-4 align-middle">{user.invoice_count || 0}</td>
                  <td className="p-4 align-middle text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditUser(user.id);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedUsers.length} of {initialUsers.length} users
      </div>
    </div>
  );
}
