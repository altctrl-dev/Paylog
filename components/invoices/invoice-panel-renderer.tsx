/**
 * Invoice Panel Renderer
 *
 * Central routing for all invoice-related panels.
 * Handles type mapping and prop passing.
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { usePanelStack } from '@/hooks/use-panel-stack';
import { InvoiceDetailPanel } from './invoice-detail-panel';
import { InvoiceDetailPanelV2 } from './invoice-detail-panel-v2';
import { InvoiceFormPanel } from './invoice-form-panel';
import { InvoiceHoldPanel } from './invoice-hold-panel';
import { InvoiceRejectPanel } from './invoice-reject-panel';
import { PaymentFormPanel } from '@/components/payments/payment-form-panel';
import { VendorFormPanel } from '@/components/master-data/vendor-form-panel';
import { CategoryFormPanel } from '@/components/master-data/category-form-panel';

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
 * - invoice-v2-detail: View Invoice V2 details (Level 1, Sprint 13)
 * - invoice-create: Create new invoice (Level 2)
 * - invoice-edit: Edit existing invoice (Level 2)
 * - invoice-hold: Put invoice on hold confirmation (Level 3)
 * - invoice-reject: Reject invoice confirmation (Level 3)
 * - payment-record: Record payment for invoice (Level 3)
 */
export function InvoicePanelRenderer({
  id,
  type,
  props,
  onClose,
}: InvoicePanelRendererProps) {
  const { panels } = usePanelStack();
  const { data: session } = useSession();
  const config = panels.find((p) => p.id === id);

  if (!config) return null;

  // Extract user role from session
  const userRole = session?.user?.role;

  switch (type) {
    case 'invoice-v2-detail':
      console.log('[InvoicePanelRenderer] Rendering invoice-v2-detail for invoiceId:', props.invoiceId);
      try {
        return (
          <InvoiceDetailPanelV2
            config={config}
            onClose={onClose}
            invoiceId={props.invoiceId as number}
            userRole={userRole}
          />
        );
      } catch (error) {
        console.error('[InvoicePanelRenderer] Error rendering invoice-v2-detail:', error);
        return <div className="p-4 text-red-500">Error loading invoice panel. Check console for details.</div>;
      }

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

    case 'invoice-reject':
      return (
        <InvoiceRejectPanel
          config={config}
          onClose={onClose}
          invoiceId={props.invoiceId as number}
          invoiceNumber={props.invoiceNumber as string}
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

    case 'vendor-form':
      return (
        <VendorFormPanel
          config={config}
          onClose={onClose}
          vendor={props.vendor as { id: number; name: string } | undefined}
        />
      );

    case 'category-form':
      return (
        <CategoryFormPanel
          config={config}
          onClose={onClose}
          category={props.category as { id: number; name: string } | undefined}
        />
      );

    default:
      return null;
  }
}
