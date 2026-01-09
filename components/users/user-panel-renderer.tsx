'use client';

import { useState } from 'react';
import {
  UserDetailPanel,
  UserFormPanel,
} from '@/components/users';

interface UserPanelRendererProps {
  selectedUserId: number | null;
  onSelectUser: (userId: number | null) => void;
  onRefreshData: () => void;
  showCreateForm?: boolean;
  onCloseCreateForm?: () => void;
}

/**
 * UserPanelRenderer
 *
 * Orchestrates the stacked panel system for user management:
 * - Detail Panel (Level 1, z-40): Shows user details when a user is selected
 * - Form Panel (Level 2, z-50): Slides over detail panel for create/edit operations
 *
 * State Management:
 * - Parent component manages `selectedUserId` (which detail panel to show)
 * - This component manages form panel state (open/closed, mode, userId)
 *
 * Data Flow:
 * - After successful mutations, calls parent's `onRefreshData()` to refresh table
 * - Detail panel can trigger edit (opens form panel)
 */
export function UserPanelRenderer({
  selectedUserId,
  onSelectUser,
  onRefreshData,
  showCreateForm = false,
  onCloseCreateForm,
}: UserPanelRendererProps) {
  // Form panel state
  // - formUserId: The user ID being edited (null when creating new user)
  // - isFormOpen: Whether form panel is visible
  // - formMode: 'create' or 'edit' (determines form behavior)
  const [formUserId, setFormUserId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

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

  return (
    <>
      {/* Detail Panel - Level 1 (350px wide, z-40) */}
      {/* Renders when a user is selected in the table */}
      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
          onRefresh={onRefreshData}
        />
      )}

      {/* Form Panel - Level 2 (500px wide, z-50) */}
      {/* Slides over detail panel when editing or creating */}
      {/* Can coexist with detail panel (stacked UX) */}
      {/* Show form if: (1) explicitly opened via edit, or (2) create mode from parent */}
      {(isFormOpen || showCreateForm) && (
        <UserFormPanel
          userId={showCreateForm ? undefined : formMode === 'edit' ? (formUserId ?? undefined) : undefined}
          onClose={showCreateForm && onCloseCreateForm ? onCloseCreateForm : handleFormClose}
          onSuccess={() => {
            if (showCreateForm) {
              onCloseCreateForm?.();
            } else {
              handleFormSuccess();
            }
            onRefreshData();
          }}
        />
      )}
    </>
  );
}
