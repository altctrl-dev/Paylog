/**
 * Vendor List Component
 *
 * Table displaying vendors with edit/archive actions (admin only).
 */

'use client';

import { Edit2, Archive, RefreshCw } from 'lucide-react';
import { useVendors, useArchiveVendor, useRestoreVendor } from '@/hooks/use-vendors';
import { Badge } from '@/components/ui/badge';

interface VendorListProps {
  onEdit: (vendor: {
    id: number;
    name: string;
    address?: string | null;
    gst_exemption?: boolean;
    bank_details?: string | null;
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

export function VendorList({ onEdit, showArchived = false }: VendorListProps) {
  const { data, isLoading } = useVendors({ is_active: !showArchived });
  const archiveMutation = useArchiveVendor();
  const restoreMutation = useRestoreVendor();

  const handleArchive = (id: number) => {
    if (confirm('Archive this vendor?')) {
      archiveMutation.mutate(id);
    }
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>;
  }

  const vendors = data?.vendors || [];

  if (vendors.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        {showArchived ? 'No archived vendors found.' : 'No vendors found. Create one to get started.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-semibold">Name</th>
            <th className="p-3 text-center text-sm font-semibold">Invoices</th>
            <th className="p-3 text-left text-sm font-semibold">Status</th>
            <th className="p-3 text-left text-sm font-semibold">Created</th>
            <th className="p-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="p-3 text-sm font-medium">{vendor.name}</td>
              <td className="p-3 text-center text-sm text-muted-foreground">
                {vendor.invoiceCount}
              </td>
              <td className="p-3 text-sm">
                <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                  {vendor.is_active ? 'Active' : 'Archived'}
                </Badge>
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {formatDate(vendor.created_at)}
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {vendor.is_active ? (
                    <>
                      <button
                        onClick={() => onEdit({
                          id: vendor.id,
                          name: vendor.name,
                          address: vendor.address,
                          gst_exemption: vendor.gst_exemption,
                          bank_details: vendor.bank_details,
                        })}
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        aria-label="Edit vendor"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(vendor.id)}
                        disabled={vendor.invoiceCount > 0}
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Archive vendor"
                        title={vendor.invoiceCount > 0 ? 'Cannot archive vendor with invoices' : 'Archive vendor'}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestore(vendor.id)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      aria-label="Restore vendor"
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
