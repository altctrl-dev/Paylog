/**
 * Invoice Panel Renderer
 *
 * Central routing for all invoice-related panels.
 * Handles type mapping and prop passing.
 */

'use client';

import * as React from 'react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { InvoiceDetailPanel } from './invoice-detail-panel';
import { InvoiceFormPanel } from './invoice-form-panel';
import { InvoiceHoldPanel } from './invoice-hold-panel';
import { PaymentFormPanel } from '@/components/payments/payment-form-panel';

interface InvoicePanelRendererProps {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Renders invoice panels based on type
 *
 * Panel types:
 * - invoice-detail: View invoice details (Level 1)
 * - invoice-create: Create new invoice (Level 2)
 * - invoice-edit: Edit existing invoice (Level 2)
 * - invoice-hold: Put invoice on hold confirmation (Level 3)
 * - payment-record: Record payment for invoice (Level 3)
 */
export function InvoicePanelRenderer({
  id,
  type,
  props,
  onClose,
}: InvoicePanelRendererProps) {
  const { panels } = usePanelStack();
  const config = panels.find((p) => p.id === id);

  if (!config) return null;

  switch (type) {
    case 'invoice-detail':
      return (
        <InvoiceDetailPanel
          config={config}
          onClose={onClose}
          invoiceId={props.invoiceId as number}
        />
      );

    case 'invoice-create':
      return (
        <InvoiceFormPanel
          config={config}
          onClose={onClose}
          // No invoiceId = create mode
        />
      );

    case 'invoice-edit':
      return (
        <InvoiceFormPanel
          config={config}
          onClose={onClose}
          invoiceId={props.invoiceId as number}
        />
      );

    case 'invoice-hold':
      return (
        <InvoiceHoldPanel
          config={config}
          onClose={onClose}
          invoiceId={props.invoiceId as number}
        />
      );

    case 'payment-record':
      return (
        <PaymentFormPanel
          config={config}
          onClose={onClose}
          invoiceId={props.invoiceId as number}
          invoiceNumber={props.invoiceNumber as string}
          invoiceAmount={props.invoiceAmount as number}
          remainingBalance={props.remainingBalance as number}
        />
      );

    default:
      return null;
  }
}
