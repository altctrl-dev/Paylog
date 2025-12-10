'use client';

import * as React from 'react';
import { useFilteredInvoices, type ApprovalStatusFilter } from '@/hooks/use-approvals';
import { usePanel } from '@/hooks/use-panel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { format } from 'date-fns';
import { PANEL_WIDTH } from '@/types/panel';
import { ApprovalStatusFilterSelect } from './approval-status-filter';

const STATUS_BADGE_CONFIG: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
  pending_approval: { label: 'Pending Approval', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function InvoiceRequestsTab() {
  const [statusFilter, setStatusFilter] = React.useState<ApprovalStatusFilter>('pending');
  const { data: invoices, isLoading, error } = useFilteredInvoices(statusFilter);
  const { openPanel } = usePanel();

  const handleViewInvoice = (invoiceId: number) => {
    openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_CONFIG[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const emptyMessage = statusFilter === 'pending'
    ? 'All invoice requests have been reviewed'
    : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}invoices found`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ApprovalStatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
        <span className="text-sm text-muted-foreground">
          {invoices?.length ?? 0} invoice{(invoices?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-destructive">
          Failed to load invoices
        </Card>
      )}

      {!isLoading && !error && (!invoices || invoices.length === 0) && (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-muted-foreground">No invoices</h3>
          <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
        </Card>
      )}

      {!isLoading && !error && invoices && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{invoice.invoice_number}</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {invoice.vendor?.name} • {formatCurrency(invoice.invoice_amount, invoice.currency?.code || 'INR')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted by {invoice.creator?.full_name} on {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewInvoice(invoice.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {statusFilter === 'pending' ? 'Review' : 'View'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default InvoiceRequestsTab;
