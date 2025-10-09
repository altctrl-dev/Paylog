/**
 * Invoice Status Badge Component
 *
 * Displays invoice status with appropriate color coding.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/types/invoice';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  const config = INVOICE_STATUS_CONFIG[status];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        Unknown
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
