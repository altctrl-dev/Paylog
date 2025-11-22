import { NonRecurringInvoiceForm } from '@/components/invoices-v2/non-recurring-invoice-form';

export const metadata = {
  title: 'New Invoice | PayLog',
  description: 'Create a new one-time invoice',
};

/**
 * Non-Recurring Invoice Creation Page
 *
 * Server Component that renders the non-recurring invoice form.
 * Requires authentication (enforced by dashboard layout).
 *
 * Features:
 * - Manual vendor, entity, category selection
 * - Optional file upload with warning
 * - Preview panel before submission
 */
export default function NewNonRecurringInvoicePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Invoice</h1>
        <p className="text-muted-foreground">
          Enter invoice details manually
        </p>
      </div>
      <NonRecurringInvoiceForm />
    </div>
  );
}
