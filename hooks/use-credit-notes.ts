/**
 * Credit Notes React Query Hooks
 *
 * Provides data fetching hooks for credit note operations.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getCreditNotesByInvoiceId,
  getCreditNotesTotalForInvoice,
  getCreditNotesWithTdsByMonth,
  type CreditNoteWithTdsSummary,
} from '@/app/actions/credit-notes';
import type { CreditNoteSummary, InvoiceCreditNotesTotal } from '@/types/credit-note';

/**
 * Fetch credit notes for an invoice
 */
export function useCreditNotes(invoiceId: number | undefined) {
  return useQuery<CreditNoteSummary[], Error>({
    queryKey: ['credit-notes', invoiceId],
    queryFn: async () => {
      if (!invoiceId) throw new Error('Invoice ID is required');

      const result = await getCreditNotesByInvoiceId(invoiceId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch credit notes');
      }

      return result.data;
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch credit note totals for an invoice
 */
export function useCreditNoteTotals(invoiceId: number | undefined) {
  return useQuery<InvoiceCreditNotesTotal, Error>({
    queryKey: ['credit-note-totals', invoiceId],
    queryFn: async () => {
      if (!invoiceId) throw new Error('Invoice ID is required');

      const result = await getCreditNotesTotalForInvoice(invoiceId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch credit note totals');
      }

      return result.data;
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch credit notes with TDS reversals by month (for TDS Tab)
 *
 * @param month - Month (0-11 for JavaScript Date, will be converted to 1-12)
 * @param year - Year
 */
export function useCreditNotesWithTdsByMonth(month: number, year: number) {
  // Convert from 0-indexed (JavaScript) to 1-indexed (server action)
  const serverMonth = month + 1;

  return useQuery<CreditNoteWithTdsSummary[], Error>({
    queryKey: ['credit-notes-tds', serverMonth, year],
    queryFn: async () => {
      const result = await getCreditNotesWithTdsByMonth(serverMonth, year);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch credit notes with TDS');
      }

      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
