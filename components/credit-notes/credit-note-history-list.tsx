/**
 * Credit Note History List Component
 *
 * Displays all credit notes for an invoice in a table format.
 * Shows credit note details including amount, reason, and TDS reversal.
 */

'use client';

import * as React from 'react';
import { useCreditNotes, useCreditNoteTotals } from '@/hooks/use-credit-notes';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

interface CreditNoteHistoryListProps {
  invoiceId: number;
  /** Currency code (ISO 4217) for proper currency formatting */
  currencyCode?: string;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function CreditNoteHistoryList({
  invoiceId,
  currencyCode,
}: CreditNoteHistoryListProps) {
  const { data: creditNotes, isLoading, error } = useCreditNotes(invoiceId);
  const { data: totals } = useCreditNoteTotals(invoiceId);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">
            Loading credit notes...
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive p-4">
        <div className="text-sm text-destructive">
          Failed to load credit notes: {error.message}
        </div>
      </Card>
    );
  }

  if (!creditNotes || creditNotes.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No credit notes recorded
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click &quot;Add Credit Note&quot; to record a credit note
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credit Note Summary Card */}
      {totals && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Credit Note Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Credit</p>
              <p className="font-semibold text-amber-600">
                -{formatCurrency(totals.totalAmount, currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TDS Reversed</p>
              <p className="font-semibold text-primary">
                {totals.totalTdsReversed > 0
                  ? formatCurrency(totals.totalTdsReversed, currencyCode)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Count</p>
              <p className="font-semibold">{totals.count}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Credit Note History Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Number
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  TDS Reversal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Reason
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                  File
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditNotes.map((cn) => (
                <tr
                  key={cn.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-sm">
                    {formatDate(cn.credit_note_date)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {cn.credit_note_number}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-amber-600">
                    -{formatCurrency(cn.amount, currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {cn.tds_applicable && cn.tds_amount ? (
                      <Badge variant="outline" className="font-normal">
                        +{formatCurrency(cn.tds_amount, currencyCode)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                    {cn.reason}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cn.has_file ? (
                      <FileText className="mx-auto h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground">
        Credit notes are listed in chronological order (newest first)
      </p>
    </div>
  );
}
