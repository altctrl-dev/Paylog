/**
 * Invoice Validation Schemas
 *
 * Zod validation schemas for invoice operations.
 * Extracted from types/invoice.ts for better separation of concerns.
 */

import { z } from 'zod';
import { INVOICE_STATUS } from '@/types/invoice';

// ============================================================================
// INVOICE FORM VALIDATION
// ============================================================================

/**
 * Invoice form validation schema
 * Used for create and update operations
 *
 * IMPORTANT: All date fields are REQUIRED (not nullable)
 * - Form will enforce date selection
 * - Prevents null/undefined date issues
 * - Cleaner type inference (Date instead of Date | null)
 */
export const invoiceFormSchema = z
  .object({
    invoice_number: z
      .string()
      .min(1, 'Invoice number is required')
      .max(100, 'Invoice number too long'),
    vendor_id: z.number().int().positive('Vendor is required'),
    category_id: z.number().int().positive('Category is required'),
    entity_id: z.number().int().positive('Entity is required'),
    currency_id: z.number().int().positive('Currency is required'),
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),
    // Date fields: Required, non-null (strict validation)
    invoice_date: z.date({
      required_error: 'Invoice date is required',
      invalid_type_error: 'Invalid date format',
    }),
    invoice_received_date: z.date({
      invalid_type_error: 'Invalid date format',
    }).nullable().optional(),
    // Period dates are OPTIONAL
    period_start: z.date({
      invalid_type_error: 'Invalid date format',
    }).nullable(),
    period_end: z.date({
      invalid_type_error: 'Invalid date format',
    }).nullable(),
    due_date: z.date({
      required_error: 'Due date is required',
      invalid_type_error: 'Invalid date format',
    }),
    tds_applicable: z.boolean(),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .nullable(),
    description: z.string().max(1000, 'Description too long').optional().nullable(),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
    // Invoice type fields
    is_recurring: z.boolean().optional().default(false),
    invoice_profile_id: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      // Validation: If one period date provided, both required
      if (data.period_start && !data.period_end) return false;
      if (!data.period_start && data.period_end) return false;
      return true;
    },
    {
      message: 'Both period start and end dates are required if one is provided',
      path: ['period_end'],
    }
  )
  .refine(
    (data) => {
      // Validation: If both provided, period_end must be >= period_start
      if (data.period_start && data.period_end) {
        return data.period_end >= data.period_start;
      }
      return true;
    },
    {
      message: 'Period end date must be after or equal to period start date',
      path: ['period_end'],
    }
  )
  .refine(
    (data) => {
      // Validation: if TDS is applicable, percentage should be provided
      if (data.tds_applicable && !data.tds_percentage) {
        return false;
      }
      return true;
    },
    {
      message: 'TDS percentage is required when TDS is applicable',
      path: ['tds_percentage'],
    }
  )
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date
      return data.due_date >= data.invoice_date;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  );

/**
 * Type inference from Zod schema
 * All dates are Date (non-null)
 */
export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// ============================================================================
// HOLD INVOICE VALIDATION
// ============================================================================

/**
 * Hold invoice validation schema
 */
export const holdInvoiceSchema = z.object({
  hold_reason: z
    .string()
    .min(10, 'Hold reason must be at least 10 characters')
    .max(500, 'Hold reason too long'),
});

export type HoldInvoiceData = z.infer<typeof holdInvoiceSchema>;

/**
 * Reject invoice validation schema
 */
export const rejectInvoiceSchema = z.object({
  rejection_reason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason too long'),
});

export type RejectInvoiceData = z.infer<typeof rejectInvoiceSchema>;

// ============================================================================
// INVOICE LIST FILTERS
// ============================================================================

/**
 * Invoice list filters
 */
export const invoiceFiltersSchema = z
  .object({
    search: z.string().optional(),
    status: z
      .enum([
        INVOICE_STATUS.PENDING_APPROVAL,
        INVOICE_STATUS.ON_HOLD,
        INVOICE_STATUS.UNPAID,
        INVOICE_STATUS.PARTIAL,
        INVOICE_STATUS.PAID,
        INVOICE_STATUS.OVERDUE,
        INVOICE_STATUS.REJECTED,
      ])
      .optional(),
    vendor_id: z.number().int().positive().optional(),
    category_id: z.number().int().positive().optional(),
    entity_id: z.number().int().positive().optional(),
    is_recurring: z.boolean().optional(),
    tds_applicable: z.boolean().optional(),
    invoice_profile_id: z.number().int().positive().optional(),
    // Archive filter - when true, shows only archived invoices
    show_archived: z.boolean().optional(),
    // Date range filters for invoice_date
    // Use coerce to handle string dates from client-server serialization
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    // Sorting parameters
    sort_by: z
      .enum(['invoice_date', 'due_date', 'invoice_amount', 'status', 'created_at'])
      .optional(),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
    page: z.number().int().positive().default(1),
    per_page: z.number().int().positive().default(20),
  })
  .refine(
    (data) => {
      // Validation: if both dates provided, end_date must be >= start_date
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['end_date'],
    }
  );

export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>;
