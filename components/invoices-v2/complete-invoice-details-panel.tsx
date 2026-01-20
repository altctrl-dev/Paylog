/**
 * Complete Invoice Details Panel
 *
 * Wrapper component to display the complete invoice details form in a side panel.
 * Used when adding actual invoice details to a pending invoice.
 * Uses PanelLevel for consistent panel styling.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { CompleteInvoiceDetailsForm } from './complete-invoice-details-form';
import type { PanelConfig } from '@/types/panel';

interface CompleteInvoiceDetailsPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  invoiceName: string;
  vendorName: string;
  currentAmount: number;
  currencySymbol?: string;
}

export function CompleteInvoiceDetailsPanel({
  config,
  onClose,
  invoiceId,
  invoiceName,
  vendorName,
  currentAmount,
  currencySymbol,
}: CompleteInvoiceDetailsPanelProps) {
  return (
    <PanelLevel
      config={config}
      title="Complete Invoice Details"
      onClose={onClose}
    >
      <div className="p-1">
        <CompleteInvoiceDetailsForm
          invoiceId={invoiceId}
          invoiceName={invoiceName}
          vendorName={vendorName}
          currentAmount={currentAmount}
          currencySymbol={currencySymbol}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </PanelLevel>
  );
}
