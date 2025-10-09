/**
 * Panel Provider Component
 *
 * Client-side wrapper for PanelContainer to be used in layouts.
 * Handles panel type routing and rendering.
 */

'use client';

import { PanelContainer } from './panel-container';
import { ExamplePanelRenderer } from './example-panel';
import { InvoicePanelRenderer } from '@/components/invoices/invoice-panel-renderer';

/**
 * Panel Provider with routing
 *
 * Add this to your root layout or dashboard layout to enable panels globally.
 *
 * Usage:
 * ```tsx
 * // In layout.tsx
 * import { PanelProvider } from '@/components/panels/panel-provider';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <>
 *       {children}
 *       <PanelProvider />
 *     </>
 *   );
 * }
 * ```
 */
export function PanelProvider() {
  return (
    <PanelContainer
      renderPanel={({ id, type, props, onClose }) => {
        // Route panel types to their respective components

        // Invoice and Payment panels (payments are handled by InvoicePanelRenderer)
        if (type.startsWith('invoice-') || type.startsWith('payment-')) {
          return (
            <InvoicePanelRenderer
              id={id}
              type={type}
              props={props}
              onClose={onClose}
            />
          );
        }

        // Example panels (for demo purposes)
        if (type.startsWith('example-')) {
          return (
            <ExamplePanelRenderer
              id={id}
              type={type}
              props={props}
              onClose={onClose}
            />
          );
        }

        // Add more panel renderers here as needed
        return null;
      }}
    />
  );
}
