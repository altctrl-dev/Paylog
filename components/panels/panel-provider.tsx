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
import { MasterDataRequestPanelRenderer } from '@/components/master-data/master-data-request-panel-renderer';
import { AdminRequestPanelRenderer } from '@/components/master-data/admin-request-panel-renderer';
import { ProfilePanelRenderer } from '@/components/master-data/profile-panel-renderer';
import { UserPanelRendererGlobal } from '@/components/users/user-panel-renderer-global';
import { AdvancePaymentPanelRenderer } from '@/components/advance-payments/advance-payment-panel-renderer';

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

        // Invoice, Payment, Credit Note, Vendor, Category, and Entity panels
        if (
          type.startsWith('invoice-') ||
          type.startsWith('payment-') ||
          type.startsWith('credit-note-') ||
          type === 'vendor-form' ||
          type === 'category-form' ||
          type === 'payment-type-form' ||
          type === 'entity-form'
        ) {
          return (
            <InvoicePanelRenderer
              id={id}
              type={type}
              props={props}
              onClose={onClose}
            />
          );
        }

        // Admin panels (master data approval)
        if (type.startsWith('admin-')) {
          return (
            <AdminRequestPanelRenderer
              id={id}
              type={type}
              props={props}
              onClose={onClose}
            />
          );
        }

        // Master Data Request panels (user-facing)
        if (type.startsWith('master-data-')) {
          return (
            <MasterDataRequestPanelRenderer
              id={id}
              type={type}
              props={props}
              onClose={onClose}
            />
          );
        }

        // Profile panels (invoice profile management)
        if (type.startsWith('profile-')) {
          return (
            <ProfilePanelRenderer
              id={id}
              type={type}
              props={props}
              onClose={onClose}
            />
          );
        }

        // User panels (user management)
        if (type.startsWith('user-')) {
          return (
            <UserPanelRendererGlobal
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

        // Advance payment panels
        if (type.startsWith('advance-payment-')) {
          return (
            <AdvancePaymentPanelRenderer
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
