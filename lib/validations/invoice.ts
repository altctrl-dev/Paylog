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
    profile_id: z.number().int().positive('Invoice profile is required'),
    sub_entity_id: z.number().int().positive('Sub entity is required'),
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),
    // Date fields: Required, non-null (strict validation)
    invoice_date: z.date({
      required_error: 'Invoice date is required',
      invalid_type_error: 'Invalid date format',
    }),
    period_start: z.date({
      required_error: 'Period start date is required',
      invalid_type_error: 'Invalid date format',
    }),
    period_end: z.date({
      required_error: 'Period end date is required',
      invalid_type_error: 'Invalid date format',
    }),
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
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  })
  .refine(
    (data) => {
      // Validation: period_end must be >= period_start
      return data.period_end >= data.period_start;
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

// ============================================================================
// INVOICE LIST FILTERS
// ============================================================================

/**
 * Invoice list filters
 */
export const invoiceFiltersSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum([
      INVOICE_STATUS.PENDING_APPROVAL,
      INVOICE_STATUS.ON_HOLD,
      INVOICE_STATUS.UNPAID,
      INVOICE_STATUS.PARTIAL,
      INVOICE_STATUS.PAID,
      INVOICE_STATUS.OVERDUE,
    ])
    .optional(),
  vendor_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  profile_id: z.number().int().positive().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(20),
});

export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>;
