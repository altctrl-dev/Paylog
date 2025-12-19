'use client';

/**
 * Ledger Table View Component (v3)
 *
 * Displays transaction history in a classic bookkeeping table format:
 * - Date | Description | Invoice Amt | TDS | Payable | Paid | Balance
 * - Invoice rows show debit (payable added to balance)
 * - Payment rows show credit (amount subtracted from balance)
 * - TDS rounding indicator on payment rows
 */

import * as React from 'react';
import { format } from 'date-fns';
import {
  FileText,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowUp,
  Hash,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { LEDGER_ENTRY_TYPE, type LedgerEntry, type LedgerSummary } from '@/types/ledger';

// ============================================================================
// Types
// ============================================================================

interface LedgerTableViewProps {
  entries: LedgerEntry[];
  summary: LedgerSummary;
  /** Currency code (ISO 4217) for proper currency formatting */
  currencyCode?: string;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency with null handling
 */
function formatCurrency(amount: number | null, currencyCode?: string): string {
  if (amount === null) return '—';
  return formatCurrencyUtil(amount, currencyCode);
}

/**
 * Format date as dd MMM yyyy
 */
function formatDate(date: Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

/**
 * Get TDS display text
 */
function getTdsDisplay(entry: LedgerEntry, currencyCode?: string): string {
  if (entry.type === LEDGER_ENTRY_TYPE.INVOICE) {
    if (entry.tdsApplicable && entry.tdsPercentage) {
      const tdsAmount = entry.invoiceAmount
        ? entry.invoiceAmount - (entry.payableAmount ?? 0)
        : 0;
      return `${formatCurrency(tdsAmount, currencyCode)} (${entry.tdsPercentage}%)`;
    }
    return '—';
  }
  // Payment entry
  if (entry.tdsAmountApplied) {
    return formatCurrency(entry.tdsAmountApplied, currencyCode);
  }
  return '—';
}

// ============================================================================
// Sub-Components
// ============================================================================

function EntryTypeIcon({ type }: { type: LedgerEntry['type'] }) {
  if (type === LEDGER_ENTRY_TYPE.INVOICE) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30">
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
      <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
    </div>
  );
}

function TdsRoundedBadge({ tdsRounded }: { tdsRounded: boolean }) {
  if (!tdsRounded) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="ml-1 px-1 py-0 text-xs bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
          >
            <ArrowUp className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>TDS rounded up (ceiling)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TransactionRef({ transactionRef }: { transactionRef: string | null }) {
  if (!transactionRef) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center text-xs text-muted-foreground ml-2">
            <Hash className="h-3 w-3 mr-0.5" />
            {transactionRef.length > 10
              ? `${transactionRef.slice(0, 10)}...`
              : transactionRef}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ref: {transactionRef}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BalanceIndicator({
  entry,
  previousBalance,
}: {
  entry: LedgerEntry;
  previousBalance: number;
}) {
  const isIncrease = entry.runningBalance > previousBalance;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        isIncrease ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
      )}
    >
      {isIncrease ? (
        <ArrowUpCircle className="h-3 w-3 mr-1" />
      ) : (
        <ArrowDownCircle className="h-3 w-3 mr-1" />
      )}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LedgerTableView({ entries, summary, currencyCode, className }: LedgerTableViewProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">Type</TableHead>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="text-right w-[120px]">Invoice Amt</TableHead>
              <TableHead className="text-right w-[120px]">TDS</TableHead>
              <TableHead className="text-right w-[120px]">Payable</TableHead>
              <TableHead className="text-right w-[120px]">Paid</TableHead>
              <TableHead className="text-right w-[130px]">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, index) => {
                const previousBalance = index > 0 ? entries[index - 1].runningBalance : 0;
                const isInvoice = entry.type === LEDGER_ENTRY_TYPE.INVOICE;

                return (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      'transition-colors',
                      isInvoice
                        ? 'bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                        : 'bg-green-50/30 dark:bg-green-950/10 hover:bg-green-50/50 dark:hover:bg-green-950/20'
                    )}
                  >
                    <TableCell>
                      <EntryTypeIcon type={entry.type} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium">{entry.description}</span>
                        {entry.type === LEDGER_ENTRY_TYPE.PAYMENT && (
                          <>
                            <TdsRoundedBadge tdsRounded={entry.tdsRounded} />
                            <TransactionRef transactionRef={entry.transactionRef} />
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Invoice #{entry.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {isInvoice ? formatCurrency(entry.invoiceAmount, currencyCode) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {getTdsDisplay(entry, currencyCode)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {isInvoice ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {formatCurrency(entry.payableAmount, currencyCode)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {!isInvoice ? (
                        <span className="text-green-700 dark:text-green-400">
                          {formatCurrency(entry.paidAmount, currencyCode)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      <div className="flex items-center justify-end">
                        <BalanceIndicator entry={entry} previousBalance={previousBalance} />
                        {formatCurrency(entry.runningBalance, currencyCode)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {/* Totals Row */}
            {entries.length > 0 && (
              <TableRow className="bg-muted/70 font-semibold border-t-2">
                <TableCell colSpan={3} className="text-right">
                  Totals
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(summary.totalInvoiced, currencyCode)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(summary.totalTdsDeducted, currencyCode)}
                </TableCell>
                <TableCell className="text-right font-mono text-amber-700 dark:text-amber-400">
                  {formatCurrency(summary.totalPayable, currencyCode)}
                </TableCell>
                <TableCell className="text-right font-mono text-green-700 dark:text-green-400">
                  {formatCurrency(summary.totalPaid, currencyCode)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span
                    className={cn(
                      summary.outstandingBalance > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-green-700 dark:text-green-400'
                    )}
                  >
                    {formatCurrency(summary.outstandingBalance, currencyCode)}
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default LedgerTableView;
