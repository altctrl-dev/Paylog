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
import { InvoiceDetailPanelV2 } from './invoice-detail-panel-v2';
import { InvoiceDetailPanelV3 } from './invoice-detail-panel-v3';
// ARCHIVED: Legacy panels moved to @/components/_archived/invoices/
// - InvoiceDetailPanel (invoice-detail-panel.tsx)
// - InvoiceFormPanel (invoice-form-panel.tsx)
import { InvoiceHoldPanel } from './invoice-hold-panel';
import { InvoiceRejectPanel } from './invoice-reject-panel';
import { PaymentFormPanel } from '@/components/payments/payment-form-panel';
import { VendorFormPanel } from '@/components/master-data/vendor-form-panel';
import { CategoryFormPanel } from '@/components/master-data/category-form-panel';
import { PaymentTypeFormPanel } from '@/components/master-data/payment-type-form-panel';
import { EntityFormPanel } from '@/components/master-data/entity-form-panel';
import { EditRecurringInvoiceForm } from '@/components/invoices-v2/edit-recurring-invoice-form';
import { EditNonRecurringInvoiceForm } from '@/components/invoices-v2/edit-non-recurring-invoice-form';
import { RecurringInvoiceFormPanel } from '@/components/invoices-v2/recurring-invoice-form-panel';
import { NonRecurringInvoiceFormPanel } from '@/components/invoices-v2/non-recurring-invoice-form-panel';
import { InvoicePendingFormPanel } from '@/components/invoices-v2/invoice-pending-form-panel';
import { CompleteInvoiceDetailsPanel } from '@/components/invoices-v2/complete-invoice-details-panel';
import { PanelLevel } from '@/components/panels/panel-level';

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

  // Extract user role and ID from session
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

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
            userId={userId}
          />
        );
      } catch (error) {
        console.error('[InvoicePanelRenderer] Error rendering invoice-v2-detail:', error);
        return <div className="p-4 text-red-500">Error loading invoice panel. Check console for details.</div>;
      }

    case 'invoice-v3-detail':
      console.log('[InvoicePanelRenderer] Rendering invoice-v3-detail for invoiceId:', props.invoiceId);
      try {
        return (
          <InvoiceDetailPanelV3
            config={config}
            onClose={onClose}
            invoiceId={props.invoiceId as number}
            userRole={userRole}
            userId={userId}
          />
        );
      } catch (error) {
        console.error('[InvoicePanelRenderer] Error rendering invoice-v3-detail:', error);
        return <div className="p-4 text-red-500">Error loading invoice panel. Check console for details.</div>;
      }

    case 'invoice-edit-recurring-v2':
      return (
        <PanelLevel config={config} title="Edit Recurring Invoice" onClose={onClose}>
          <EditRecurringInvoiceForm
            invoiceId={props.invoiceId as number}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </PanelLevel>
      );

    case 'invoice-edit-non-recurring-v2':
      return (
        <PanelLevel config={config} title="Edit Non-Recurring Invoice" onClose={onClose}>
          <EditNonRecurringInvoiceForm
            invoiceId={props.invoiceId as number}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </PanelLevel>
      );

    // ARCHIVED: Legacy panel types - components in @/components/_archived/invoices/
    // case 'invoice-detail':
    // case 'invoice-create':
    // case 'invoice-edit':

    case 'invoice-create-recurring':
      return (
        <RecurringInvoiceFormPanel
          config={config}
          onClose={onClose}
          defaultProfileId={props.profileId as number | undefined}
        />
      );

    case 'invoice-create-non-recurring':
      return (
        <NonRecurringInvoiceFormPanel
          config={config}
          onClose={onClose}
        />
      );

    case 'invoice-create-pending':
      return (
        <InvoicePendingFormPanel
          config={config}
          onClose={onClose}
        />
      );

    case 'invoice-complete-details':
      return (
        <CompleteInvoiceDetailsPanel
          config={config}
          onClose={onClose}
          invoiceId={props.invoiceId as number}
          invoiceName={props.invoiceName as string}
          vendorName={props.vendorName as string}
          currentAmount={props.currentAmount as number}
          currencySymbol={props.currencySymbol as string | undefined}
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
          invoiceName={props.invoiceName as string | undefined}
          invoiceStatus={props.invoiceStatus as import('@/types/invoice').InvoiceStatus | undefined}
          invoiceAmount={props.invoiceAmount as number}
          remainingBalance={props.remainingBalance as number}
          tdsApplicable={props.tdsApplicable as boolean | undefined}
          tdsPercentage={props.tdsPercentage as number | undefined}
          tdsRounded={props.tdsRounded as boolean | undefined}
          vendorName={props.vendorName as string | undefined}
          currencyCode={props.currencyCode as string | undefined}
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

    case 'payment-type-form':
      return (
        <PaymentTypeFormPanel
          config={config}
          onClose={onClose}
          paymentType={
            props.paymentType as
              | { id: number; name: string; description?: string | null; requires_reference: boolean }
              | undefined
          }
        />
      );

    case 'entity-form':
      return (
        <EntityFormPanel
          config={config}
          onClose={onClose}
          entity={
            props.entity as
              | { id: number; name: string; description?: string | null; address: string; country: string }
              | undefined
          }
        />
      );

    default:
      return null;
  }
}
