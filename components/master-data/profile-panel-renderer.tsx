/**
 * Profile Panel Renderer
 *
 * Routes profile panel types to appropriate components.
 * Part of Bug Fix: Replace modal with stacked panels (Sprint 11 Phase 4).
 */

'use client';

import * as React from 'react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { ProfileDetailPanel } from './profile-detail-panel';
import { ProfileFormPanel } from './profile-form-panel';

interface ProfilePanelRendererProps {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Renders profile panels based on type
 *
 * Panel types:
 * - profile-detail: View profile details (Level 1, 350px)
 * - profile-form: Create new profile (Level 2, 500px)
 * - profile-edit: Edit existing profile (Level 2, 500px)
 */
export function ProfilePanelRenderer({
  id,
  type,
  props,
  onClose,
}: ProfilePanelRendererProps) {
  const { panels } = usePanelStack();
  const config = panels.find((p) => p.id === id);

  if (!config) return null;

  switch (type) {
    case 'profile-detail':
      return (
        <ProfileDetailPanel
          config={config}
          onClose={onClose}
          profileId={props.profileId as number}
          onEdit={props.onEdit as (id: number) => void}
          onDelete={props.onDelete as (id: number) => void}
        />
      );

    case 'profile-form':
    case 'profile-edit':
      return (
        <ProfileFormPanel
          config={config}
          onClose={onClose}
          profileId={type === 'profile-edit' ? (props.profileId as number) : undefined}
          onSuccess={props.onSuccess as () => void}
        />
      );

    default:
      console.error(`Unknown profile panel type: ${type}`);
      return null;
  }
}
