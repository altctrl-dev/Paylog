/**
 * Master Data Request Panel Renderer
 *
 * Central routing for all master data request panels.
 * Handles type mapping and prop passing.
 */

'use client';

import * as React from 'react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { MasterDataRequestFormPanel } from './master-data-request-form-panel';
import { MasterDataRequestDetailPanel } from './master-data-request-detail-panel';
import type { MasterDataEntityType } from '@/app/actions/master-data-requests';

interface MasterDataRequestPanelRendererProps {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Renders master data request panels based on type
 *
 * Panel types:
 * - master-data-request-form: Create/edit request form (Level 2)
 * - master-data-request-detail: View request details (Level 2)
 */
export function MasterDataRequestPanelRenderer({
  id,
  type,
  props,
  onClose,
}: MasterDataRequestPanelRendererProps) {
  const { panels } = usePanelStack();
  const config = panels.find((p) => p.id === id);

  if (!config) return null;

  switch (type) {
    case 'master-data-request-form':
      return (
        <MasterDataRequestFormPanel
          config={config}
          onClose={onClose}
          entityType={props.entityType as MasterDataEntityType}
          initialData={props.initialData as Record<string, any> | undefined}
          isResubmit={props.isResubmit as boolean | undefined}
          originalRequestId={props.originalRequestId as number | undefined}
        />
      );

    case 'master-data-request-detail':
      return (
        <MasterDataRequestDetailPanel
          config={config}
          onClose={onClose}
          requestId={props.requestId as number}
        />
      );

    default:
      return null;
  }
}
