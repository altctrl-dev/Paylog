/**
 * Admin Request Panel Renderer
 *
 * Central routing for all admin-specific master data request panels.
 * Handles type mapping and prop passing for admin review workflows.
 */

'use client';

import * as React from 'react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { AdminRequestReviewPanel } from './admin-request-review-panel';
import { BulkArchiveReviewPanel } from './bulk-archive-review-panel';
import { RejectionReasonModal } from './rejection-reason-modal';

interface AdminRequestPanelRendererProps {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Renders admin request panels based on type
 *
 * Panel types:
 * - admin-request-review: Review and approve/reject request (Level 2)
 * - admin-rejection-modal: Provide rejection reason (Level 3)
 */
export function AdminRequestPanelRenderer({ id, type, props, onClose }: AdminRequestPanelRendererProps) {
  const { panels } = usePanelStack();
  const config = panels.find((p) => p.id === id);

  if (!config) return null;

  switch (type) {
    case 'admin-request-review':
      {
        const numericRequestId = Number(props.requestId);
        if (!Number.isFinite(numericRequestId)) {
          console.error('[AdminRequestPanelRenderer] Invalid requestId provided:', props.requestId);
          return null;
        }
        return (
          <AdminRequestReviewPanel
            config={config}
            onClose={onClose}
            requestId={numericRequestId}
          />
        );
      }

    case 'admin-rejection-modal':
      return <RejectionReasonModal config={config} onClose={onClose} requestId={props.requestId as number} />;

    case 'bulk-archive-review':
      {
        const numericRequestId = Number(props.requestId);
        if (!Number.isFinite(numericRequestId)) {
          console.error('[AdminRequestPanelRenderer] Invalid requestId for bulk archive:', props.requestId);
          return null;
        }
        return (
          <BulkArchiveReviewPanel
            config={config}
            onClose={onClose}
            requestId={numericRequestId}
          />
        );
      }

    default:
      return null;
  }
}
