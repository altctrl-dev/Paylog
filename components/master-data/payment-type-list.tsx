/**
 * Payment Type List Component
 *
 * Table displaying payment types with edit/archive actions (admin only).
 * Follows patterns from components/master-data/category-list.tsx
 */

'use client';

import { Edit2, Archive, RefreshCw } from 'lucide-react';
import { usePaymentTypes, useArchivePaymentType, useRestorePaymentType } from '@/hooks/use-payment-types';
import { Badge } from '@/components/ui/badge';

interface PaymentTypeListProps {
  onEdit: (paymentType: {
    id: number;
    name: string;
    description?: string | null;
    requires_reference: boolean;
  }) => void;
  showArchived?: boolean;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function PaymentTypeList({ onEdit, showArchived = false }: PaymentTypeListProps) {
  const { data, isLoading } = usePaymentTypes({ is_active: !showArchived });
  const archiveMutation = useArchivePaymentType();
  const restoreMutation = useRestorePaymentType();

  const handleArchive = (id: number) => {
    if (confirm('Archive this payment type?')) {
      archiveMutation.mutate(id);
    }
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading payment types...</div>;
  }

  const paymentTypes = data?.paymentTypes || [];

  if (paymentTypes.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        {showArchived ? 'No archived payment types found.' : 'No payment types found. Create one to get started.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-semibold">Name</th>
            <th className="p-3 text-left text-sm font-semibold">Description</th>
            <th className="p-3 text-center text-sm font-semibold">Requires Reference</th>
            <th className="p-3 text-center text-sm font-semibold">Invoices</th>
            <th className="p-3 text-left text-sm font-semibold">Status</th>
            <th className="p-3 text-left text-sm font-semibold">Created</th>
            <th className="p-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paymentTypes.map((paymentType) => (
            <tr key={paymentType.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="p-3 text-sm font-medium">{paymentType.name}</td>
              <td className="p-3 text-sm text-muted-foreground">
                {paymentType.description || '-'}
              </td>
              <td className="p-3 text-center">
                <Badge variant={paymentType.requires_reference ? 'default' : 'outline'}>
                  {paymentType.requires_reference ? 'Yes' : 'No'}
                </Badge>
              </td>
              <td className="p-3 text-center text-sm text-muted-foreground">
                {paymentType.invoiceCount}
              </td>
              <td className="p-3 text-sm">
                <Badge variant={paymentType.is_active ? 'default' : 'secondary'}>
                  {paymentType.is_active ? 'Active' : 'Archived'}
                </Badge>
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {formatDate(paymentType.created_at)}
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {paymentType.is_active ? (
                    <>
                      <button
                        onClick={() =>
                          onEdit({
                            id: paymentType.id,
                            name: paymentType.name,
                            description: paymentType.description,
                            requires_reference: paymentType.requires_reference,
                          })
                        }
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        aria-label="Edit payment type"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(paymentType.id)}
                        disabled={paymentType.invoiceCount > 0}
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Archive payment type"
                        title={paymentType.invoiceCount > 0 ? 'Cannot archive payment type with invoices' : 'Archive payment type'}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestore(paymentType.id)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      aria-label="Restore payment type"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
