/**
 * Non-Recurring Invoice Form Panel
 *
 * Wrapper component to display the non-recurring invoice form in a side panel.
 * Uses PanelLevel for consistent panel styling.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { NonRecurringInvoiceForm } from './non-recurring-invoice-form';
import type { PanelConfig } from '@/types/panel';

interface NonRecurringInvoiceFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
}

export function NonRecurringInvoiceFormPanel({
  config,
  onClose,
}: NonRecurringInvoiceFormPanelProps) {
  return (
    <PanelLevel
      config={config}
      title="Create Invoice"
      onClose={onClose}
    >
      <div className="p-1">
        <NonRecurringInvoiceForm
          onSuccess={() => {
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </PanelLevel>
  );
}
