/**
 * User Panel Renderer (Global)
 *
 * Central routing for all user management panels in the global panel system.
 * Handles type mapping and prop passing via PanelProvider.
 *
 * This differs from UserPanelRenderer which is used for local state management.
 */

'use client';

import * as React from 'react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { UserDetailPanelV3 } from './user-detail-panel-v3';
import { UserFormPanelGlobal } from './user-form-panel-global';

interface UserPanelRendererGlobalProps {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Renders user panels based on type for the global panel system
 *
 * Panel types:
 * - user-detail: View user details (Level 1, 350px)
 * - user-form: Create new user (Level 2, 500px)
 * - user-edit: Edit existing user (Level 2, 500px)
 */
export function UserPanelRendererGlobal({
  id,
  type,
  props,
  onClose,
}: UserPanelRendererGlobalProps) {
  const { panels } = usePanelStack();
  const config = panels.find((p) => p.id === id);

  if (!config) return null;

  switch (type) {
    case 'user-detail':
      return (
        <UserDetailPanelV3
          config={config}
          onClose={onClose}
          userId={props.userId as number}
          onEdit={props.onEdit as () => void}
          onPasswordReset={props.onPasswordReset as () => void}
          onResendInvite={props.onResendInvite as (() => void) | undefined}
          onDeleteUser={props.onDeleteUser as (() => void) | undefined}
          onRestoreUser={props.onRestoreUser as (() => void) | undefined}
          onRefresh={props.onRefresh as (() => void) | undefined}
        />
      );

    case 'user-form':
      return (
        <UserFormPanelGlobal
          config={config}
          onClose={onClose}
          onSuccess={props.onSuccess as () => void}
        />
      );

    case 'user-edit':
      return (
        <UserFormPanelGlobal
          config={config}
          onClose={onClose}
          userId={props.userId as number}
          onSuccess={props.onSuccess as () => void}
        />
      );

    default:
      console.error(`Unknown user panel type: ${type}`);
      return null;
  }
}
