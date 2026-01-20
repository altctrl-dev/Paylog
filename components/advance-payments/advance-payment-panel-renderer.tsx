'use client';

/**
 * Advance Payment Panel Renderer
 *
 * Routes advance payment panel types to their respective components.
 */

import { AdvancePaymentFormPanel } from './advance-payment-form-panel';

interface AdvancePaymentPanelRendererProps {
  id: string;
  type: string;
  props: Record<string, unknown>;
  onClose: () => void;
}

export function AdvancePaymentPanelRenderer({
  type,
  props,
}: AdvancePaymentPanelRendererProps) {
  switch (type) {
    case 'advance-payment-create':
      return (
        <AdvancePaymentFormPanel
          defaultMonth={props.defaultMonth as number | undefined}
          defaultYear={props.defaultYear as number | undefined}
        />
      );

    default:
      return null;
  }
}
