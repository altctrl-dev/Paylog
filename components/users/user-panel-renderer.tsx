'use client';

import { useState } from 'react';
import {
  UserDetailPanel,
  UserFormPanel,
  PasswordResetDialog,
} from '@/components/users';

interface UserPanelRendererProps {
  selectedUserId: number | null;
  onSelectUser: (userId: number | null) => void;
  onRefreshData: () => void;
}

/**
 * UserPanelRenderer
 *
 * Orchestrates the stacked panel system for user management:
 * - Detail Panel (Level 1, z-40): Shows user details when a user is selected
 * - Form Panel (Level 2, z-50): Slides over detail panel for create/edit operations
 * - Password Reset Dialog: Modal overlay for password reset
 *
 * State Management:
 * - Parent component manages `selectedUserId` (which detail panel to show)
 * - This component manages form panel state (open/closed, mode, userId)
 * - This component manages password reset dialog state
 *
 * Data Flow:
 * - After successful mutations, calls parent's `onRefreshData()` to refresh table
 * - Detail panel can trigger edit (opens form panel)
 * - Detail panel can trigger password reset (opens dialog)
 */
export function UserPanelRenderer({
  selectedUserId,
  onSelectUser,
  onRefreshData,
}: UserPanelRendererProps) {
  // Form panel state
  // - formUserId: The user ID being edited (null when creating new user)
  // - isFormOpen: Whether form panel is visible
  // - formMode: 'create' or 'edit' (determines form behavior)
  const [formUserId, setFormUserId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Password reset dialog state
  // - resetPasswordUserId: User ID for password reset (null = dialog closed)
  // - resetPasswordUserName: User name to display in dialog
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordUserName, setResetPasswordUserName] = useState<string>('');

  /**
   * Handler: User clicks "Edit" button on detail panel
   * Opens form panel in edit mode with the selected user
   */
  const handleEdit = () => {
    if (selectedUserId) {
      setFormUserId(selectedUserId);
      setFormMode('edit');
      setIsFormOpen(true);
    }
  };

  /**
   * Handler: User clicks "Reset Password" button on detail panel
   * Opens password reset dialog with user info
   *
   * Note: Currently receives no params from UserDetailPanel.
   * We need to enhance this later to receive userId and userName.
   * For now, we'll use selectedUserId and fetch name from detail panel's state.
   */
  const handlePasswordReset = () => {
    if (selectedUserId) {
      setResetPasswordUserId(selectedUserId);
      // TODO: Get userName from detail panel state
      // For now, using placeholder. Will be fixed when detail panel passes userName.
      setResetPasswordUserName('User');
    }
  };

  /**
   * Handler: User closes detail panel
   * Clears selection in parent component
   */
  const handleCloseDetail = () => {
    onSelectUser(null);
  };

  /**
   * Handler: Form panel operation succeeds (create or update)
   * - Closes form panel
   * - Clears form state
   * - Triggers parent data refresh (table will update)
   */
  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setFormUserId(null);
    onRefreshData();
  };

  /**
   * Handler: User closes form panel without saving
   * Clears form state without refreshing data
   */
  const handleFormClose = () => {
    setIsFormOpen(false);
    setFormUserId(null);
  };

  /**
   * Handler: Password reset succeeds
   * Triggers parent data refresh (audit history will update)
   */
  const handlePasswordResetSuccess = () => {
    onRefreshData();
  };

  /**
   * Handler: Password reset dialog closes
   * Clears dialog state
   */
  const handlePasswordResetClose = (open: boolean) => {
    if (!open) {
      setResetPasswordUserId(null);
      setResetPasswordUserName('');
    }
  };

  return (
    <>
      {/* Detail Panel - Level 1 (350px wide, z-40) */}
      {/* Renders when a user is selected in the table */}
      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
          onPasswordReset={handlePasswordReset}
          onRefresh={onRefreshData}
        />
      )}

      {/* Form Panel - Level 2 (500px wide, z-50) */}
      {/* Slides over detail panel when editing or creating */}
      {/* Can coexist with detail panel (stacked UX) */}
      {isFormOpen && (
        <UserFormPanel
          userId={formMode === 'edit' ? (formUserId ?? undefined) : undefined}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Password Reset Dialog - Modal Overlay */}
      {/* Renders on top of all panels when password reset is triggered */}
      <PasswordResetDialog
        userId={resetPasswordUserId || 0}
        userName={resetPasswordUserName}
        open={resetPasswordUserId !== null}
        onOpenChange={handlePasswordResetClose}
        onSuccess={handlePasswordResetSuccess}
      />
    </>
  );
}
