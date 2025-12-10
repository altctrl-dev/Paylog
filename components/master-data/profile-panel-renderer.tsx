/**
 * Profile Panel Renderer
 *
 * Routes profile panel types to appropriate components.
 * Part of Bug Fix: Replace modal with stacked panels (Sprint 11 Phase 4).
 */

'use client';

import * as React from 'react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { ProfileDetailPanelV3 } from './profile-detail-panel-v3';
import { ProfileFormPanel } from './profile-form-panel';
import { ProfileInvoicesPanelV3 } from './profile-invoices-panel-v3';
import { ProfilePaymentPanelV3 } from './profile-payment-panel-v3';

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
 * - profile-invoices: View profile with pending invoices (Level 1, 400px)
 * - profile-payment: Record payment for profile invoices (Level 1, 400px)
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
        <ProfileDetailPanelV3
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

    case 'profile-invoices':
      return (
        <ProfileInvoicesPanelV3
          config={config}
          onClose={onClose}
          profileId={props.profileId as number}
        />
      );

    case 'profile-payment':
      return (
        <ProfilePaymentPanelV3
          config={config}
          onClose={onClose}
          profileId={props.profileId as number}
        />
      );

    default:
      console.error(`Unknown profile panel type: ${type}`);
      return null;
  }
}
