'use server';

/**
 * Server Actions: Unified Entries
 *
 * Fetches Invoices, Credit Notes, and Advance Payments as a unified list
 * for the All Invoices Tab display.
 */

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import type {
  UnifiedEntry,
  UnifiedEntryFilters,
  UnifiedEntryListResponse,
  InvoiceEntry,
  CreditNoteEntry,
  AdvancePaymentEntry,
} from '@/types/unified-entry';

import { PENDING_ACTION_STATUSES } from '@/types/unified-entry';

export async function getUnifiedEntries(
  filters: UnifiedEntryFilters
): Promise<
  { success: true; data: UnifiedEntryListResponse } | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const {
      entry_types,
      status,
      pending_actions,
      vendor_id,
      category_id,
      entity_id,
      is_recurring,
      tds_applicable,
      show_archived,
      date_from,
      date_to,
      search,
      page,
      per_page,
    } = filters;

    // Determine which types to fetch (default: all)
    const fetchInvoices = !entry_types || entry_types.includes('invoice');
    const fetchCreditNotes = !entry_types || entry_types.includes('credit_note');
    const fetchAdvancePayments = !entry_types || entry_types.includes('advance_payment');

    const entries: UnifiedEntry[] = [];
    let invoiceCount = 0;
    let creditNoteCount = 0;
    let advancePaymentCount = 0;

    // Fetch invoices
    if (fetchInvoices) {
      // Determine status filter for invoices
      let invoiceStatusFilter: Prisma.InvoiceWhereInput['status'];
      if (pending_actions) {
        // Pending actions for invoices: pending_approval, unpaid, partial, overdue, on_hold
        invoiceStatusFilter = { in: PENDING_ACTION_STATUSES.invoice as unknown as string[] };
      } else if (status && status.length > 0) {
        invoiceStatusFilter = { in: status };
      }

      const invoiceWhere: Prisma.InvoiceWhereInput = {
        deleted_at: null,
        is_archived: show_archived ?? false,
        ...(vendor_id && { vendor_id }),
        ...(category_id && { category_id }),
        ...(entity_id && { entity_id }),
        ...(is_recurring !== undefined && { is_recurring }),
        ...(tds_applicable !== undefined && { tds_applicable }),
        ...(invoiceStatusFilter && { status: invoiceStatusFilter }),
        ...(date_from && { invoice_date: { gte: date_from } }),
        ...(date_to && { invoice_date: { lte: date_to } }),
        ...(search && {
          OR: [
            { invoice_number: { contains: search, mode: 'insensitive' as const } },
            { invoice_name: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [invoices, count] = await Promise.all([
        db.invoice.findMany({
          where: invoiceWhere,
          include: {
            vendor: { select: { id: true, name: true } },
            currency: { select: { code: true } },
            entity: { select: { name: true } },
            category: { select: { name: true } },
            creator: { select: { full_name: true } },
            credit_notes: { where: { deleted_at: null }, select: { id: true } },
          },
          orderBy: { created_at: 'desc' },
        }),
        db.invoice.count({ where: invoiceWhere }),
      ]);

      invoiceCount = count;

      for (const inv of invoices) {
        entries.push({
          entry_type: 'invoice',
          id: inv.id,
          invoice_id: inv.id,
          reference_number: inv.invoice_number,
          name: inv.invoice_name || inv.invoice_number,
          vendor_name: inv.vendor.name,
          vendor_id: inv.vendor.id,
          amount: inv.invoice_amount,
          date: inv.invoice_date || inv.created_at,
          status: inv.status as InvoiceEntry['status'],
          currency_code: inv.currency?.code || 'INR',
          entity_name: inv.entity?.name || null,
          category_name: inv.category?.name || null,
          due_date: inv.due_date,
          is_recurring: inv.is_recurring,
          invoice_pending: inv.invoice_pending,
          tds_applicable: inv.tds_applicable,
          tds_percentage: inv.tds_percentage,
          created_at: inv.created_at,
          created_by_name: inv.creator?.full_name || null,
          linked_invoice_id: null,
          linked_invoice_number: null,
          linked_credit_note_count: inv.credit_notes.length,
        } as InvoiceEntry);
      }
    }

    // Fetch credit notes (only when not showing archived - credit notes don't have archive)
    if (fetchCreditNotes && !show_archived) {
      // Determine status filter for credit notes
      let creditNoteStatusFilter: Prisma.CreditNoteWhereInput['status'];
      if (pending_actions) {
        // Pending actions for credit notes: pending_approval only
        creditNoteStatusFilter = { in: PENDING_ACTION_STATUSES.credit_note as unknown as string[] };
      } else if (status && status.length > 0) {
        creditNoteStatusFilter = { in: status };
      }

      // Build invoice relation filter (combine all to avoid spread overwrite)
      const cnInvoiceFilter: Prisma.InvoiceWhereInput = {};
      if (vendor_id) cnInvoiceFilter.vendor_id = vendor_id;
      if (category_id) cnInvoiceFilter.category_id = category_id;
      if (entity_id) cnInvoiceFilter.entity_id = entity_id;

      const creditNoteWhere: Prisma.CreditNoteWhereInput = {
        deleted_at: null,
        ...(Object.keys(cnInvoiceFilter).length > 0 && { invoice: cnInvoiceFilter }),
        ...(tds_applicable !== undefined && { tds_applicable }),
        ...(creditNoteStatusFilter && { status: creditNoteStatusFilter }),
        ...(date_from && { credit_note_date: { gte: date_from } }),
        ...(date_to && { credit_note_date: { lte: date_to } }),
        ...(search && {
          OR: [
            { credit_note_number: { contains: search, mode: 'insensitive' as const } },
            { reason: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [creditNotes, count] = await Promise.all([
        db.creditNote.findMany({
          where: creditNoteWhere,
          include: {
            invoice: {
              include: {
                vendor: { select: { id: true, name: true } },
                currency: { select: { code: true } },
              },
            },
            created_by: { select: { full_name: true } },
            approved_by: { select: { full_name: true } },
          },
          orderBy: { created_at: 'desc' },
        }),
        db.creditNote.count({ where: creditNoteWhere }),
      ]);

      creditNoteCount = count;

      for (const cn of creditNotes) {
        entries.push({
          entry_type: 'credit_note',
          id: cn.id,
          credit_note_id: cn.id,
          reference_number: cn.credit_note_number,
          name: cn.reason,
          vendor_name: cn.invoice.vendor.name,
          vendor_id: cn.invoice.vendor.id,
          amount: -cn.amount, // Negative for credit notes
          date: cn.credit_note_date,
          status: cn.status as CreditNoteEntry['status'],
          currency_code: cn.invoice.currency?.code || 'INR',
          tds_applicable: cn.tds_applicable,
          tds_amount: cn.tds_amount,
          reason: cn.reason,
          parent_invoice_number: cn.invoice.invoice_number,
          parent_invoice_id: cn.invoice_id,
          created_at: cn.created_at,
          created_by_name: cn.created_by?.full_name || null,
          approved_by_name: cn.approved_by?.full_name || null,
          approved_at: cn.approved_at,
          linked_invoice_id: cn.invoice_id,
          linked_invoice_number: cn.invoice.invoice_number,
          linked_credit_note_count: 0,
        } as CreditNoteEntry);
      }
    }

    // Fetch advance payments (only when not showing archived)
    if (fetchAdvancePayments && !show_archived) {
      // Determine status filter for advance payments
      let advancePaymentStatusFilter: Prisma.AdvancePaymentWhereInput['status'];
      if (pending_actions) {
        // Pending actions for advance payments: pending_approval only
        advancePaymentStatusFilter = {
          in: PENDING_ACTION_STATUSES.advance_payment as unknown as string[],
        };
      } else if (status && status.length > 0) {
        advancePaymentStatusFilter = { in: status };
      }

      const advancePaymentWhere: Prisma.AdvancePaymentWhereInput = {
        deleted_at: null,
        ...(vendor_id && { vendor_id }),
        ...(advancePaymentStatusFilter && { status: advancePaymentStatusFilter }),
        ...(date_from && { payment_date: { gte: date_from } }),
        ...(date_to && { payment_date: { lte: date_to } }),
        ...(search && {
          OR: [
            { description: { contains: search, mode: 'insensitive' as const } },
            { payment_reference: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [advancePayments, count] = await Promise.all([
        db.advancePayment.findMany({
          where: advancePaymentWhere,
          include: {
            vendor: { select: { id: true, name: true } },
            payment_type: { select: { name: true } },
            created_by: { select: { full_name: true } },
            approved_by: { select: { full_name: true } },
            linked_invoice: { select: { id: true, invoice_number: true } },
          },
          orderBy: { created_at: 'desc' },
        }),
        db.advancePayment.count({ where: advancePaymentWhere }),
      ]);

      advancePaymentCount = count;

      for (const ap of advancePayments) {
        entries.push({
          entry_type: 'advance_payment',
          id: ap.id,
          advance_payment_id: ap.id,
          reference_number: `ADV-${ap.id}`,
          name: ap.description,
          vendor_name: ap.vendor.name,
          vendor_id: ap.vendor.id,
          amount: ap.amount,
          date: ap.payment_date,
          status: ap.status as AdvancePaymentEntry['status'],
          payment_type_name: ap.payment_type.name,
          payment_reference: ap.payment_reference,
          description: ap.description,
          created_at: ap.created_at,
          created_by_name: ap.created_by?.full_name || null,
          approved_by_name: ap.approved_by?.full_name || null,
          approved_at: ap.approved_at,
          linked_invoice_id: ap.linked_invoice?.id || null,
          linked_invoice_number: ap.linked_invoice?.invoice_number || null,
          linked_credit_note_count: 0,
        } as AdvancePaymentEntry);
      }
    }

    // Sort all entries by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Paginate
    const total = entries.length;
    const total_pages = Math.ceil(total / per_page);
    const start = (page - 1) * per_page;
    const paginatedEntries = entries.slice(start, start + per_page);

    return {
      success: true,
      data: {
        entries: paginatedEntries,
        total,
        page,
        per_page,
        total_pages,
        counts: {
          invoice: invoiceCount,
          credit_note: creditNoteCount,
          advance_payment: advancePaymentCount,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching unified entries:', error);
    return { success: false, error: 'Failed to fetch unified entries' };
  }
}
