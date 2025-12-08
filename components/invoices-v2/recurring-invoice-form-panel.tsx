/**
 * Recurring Invoice Form Panel
 *
 * Wrapper component to display the recurring invoice form in a side panel.
 * Uses PanelLevel for consistent panel styling.
 *
 * Can optionally accept a defaultProfileId to pre-select the invoice profile
 * when opened from a recurring invoice card's "Add New Invoice" action.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { RecurringInvoiceForm } from './recurring-invoice-form';
import type { PanelConfig } from '@/types/panel';

interface RecurringInvoiceFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  /** Optional profile ID to pre-select the invoice profile */
  defaultProfileId?: number;
}

export function RecurringInvoiceFormPanel({
  config,
  onClose,
  defaultProfileId,
}: RecurringInvoiceFormPanelProps) {
  return (
    <PanelLevel
      config={config}
      title="Create Recurring Invoice"
      onClose={onClose}
    >
      <div className="p-1">
        <RecurringInvoiceForm
          onSuccess={() => {
            onClose();
          }}
          onCancel={onClose}
          defaultProfileId={defaultProfileId}
        />
      </div>
    </PanelLevel>
  );
}
