'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/types/invoice';
import { cn } from '@/lib/utils';

export interface PanelV3HeaderProps {
  invoiceNumber: string;
  invoiceName?: string | null;
  vendorName: string;
  status: InvoiceStatus;
  isRecurring: boolean;
  isArchived: boolean;
  className?: string;
}

export function PanelV3Header({
  invoiceNumber,
  invoiceName,
  vendorName,
  status,
  isRecurring,
  isArchived,
  className,
}: PanelV3HeaderProps) {
  const statusConfig = INVOICE_STATUS_CONFIG[status];

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{invoiceNumber}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          {isRecurring && <Badge variant="secondary">Recurring</Badge>}
          {isArchived && <Badge variant="muted">Archived</Badge>}
        </div>
      </div>
      {invoiceName && (
        <p className="text-sm text-muted-foreground">{invoiceName}</p>
      )}
      <p className="text-sm text-muted-foreground">from {vendorName}</p>
    </div>
  );
}
