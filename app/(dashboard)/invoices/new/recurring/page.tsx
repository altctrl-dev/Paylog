import { RecurringInvoiceForm } from '@/components/invoices-v2/recurring-invoice-form';

export const metadata = {
  title: 'New Recurring Invoice | PayLog',
  description: 'Create a new recurring invoice from an invoice profile',
};

/**
 * Recurring Invoice Creation Page
 *
 * Server Component that renders the recurring invoice form.
 * Requires authentication (enforced by dashboard layout).
 *
 * Features:
 * - Select invoice profile to auto-populate vendor, entity, category
 * - TDS and payment fields pre-filled from profile defaults
 * - Mandatory file upload
 * - Preview panel before submission
 */
export default function NewRecurringInvoicePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Recurring Invoice</h1>
        <p className="text-muted-foreground">
          Select an invoice profile to auto-populate vendor, entity, and category
        </p>
      </div>
      <RecurringInvoiceForm />
    </div>
  );
}
