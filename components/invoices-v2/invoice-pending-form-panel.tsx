/**
 * Invoice Pending Form Panel
 *
 * Wrapper component to display the invoice pending form in a side panel.
 * Used when recording a payment before the invoice is received.
 * Uses PanelLevel for consistent panel styling.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { InvoicePendingForm } from './invoice-pending-form';
import type { PanelConfig } from '@/types/panel';

interface InvoicePendingFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
}

export function InvoicePendingFormPanel({
  config,
  onClose,
}: InvoicePendingFormPanelProps) {
  return (
    <PanelLevel
      config={config}
      title="Record Payment (Invoice Pending)"
      onClose={onClose}
    >
      <div className="p-1">
        <InvoicePendingForm
          onSuccess={() => {
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </PanelLevel>
  );
}
