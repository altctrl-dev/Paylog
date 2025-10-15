/**
 * Bulk Operations Validation Schemas
 *
 * Zod schemas for validating bulk operations.
 * Sprint 7: Bulk Operations
 */

import { z } from 'zod';

/**
 * Bulk approve validation schema
 * Validates bulk approval requests
 */
export const bulkApproveSchema = z.object({
  invoiceIds: z
    .array(z.number().int().positive())
    .min(1, 'No invoices selected')
    .max(100, 'Maximum 100 invoices per bulk operation'),
});

/**
 * Bulk reject validation schema
 * Validates bulk rejection requests with required reason
 */
export const bulkRejectSchema = z.object({
  invoiceIds: z
    .array(z.number().int().positive())
    .min(1, 'No invoices selected')
    .max(100, 'Maximum 100 invoices per bulk operation'),
  rejectionReason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason too long (max 500 characters)')
    .refine((val) => val.trim().length >= 10, {
      message: 'Rejection reason must be at least 10 characters (excluding whitespace)',
    }),
});

/**
 * Bulk export validation schema
 * Validates export requests with column selection
 */
export const bulkExportSchema = z.object({
  invoiceIds: z
    .array(z.number().int().positive())
    .min(1, 'No invoices selected')
    .max(1000, 'Maximum 1000 invoices per export'),
  selectedColumns: z
    .array(z.string())
    .min(1, 'No columns selected')
    .max(20, 'Maximum 20 columns per export'),
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
});

/**
 * Bulk delete validation schema
 * Validates bulk deletion with confirmation
 */
export const bulkDeleteSchema = z.object({
  invoiceIds: z
    .array(z.number().int().positive())
    .min(1, 'No invoices selected')
    .max(50, 'Maximum 50 invoices per bulk delete'),
});

/**
 * Bulk delete confirmation schema
 * Requires explicit "DELETE" confirmation
 */
export const bulkDeleteConfirmationSchema = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'You must type "DELETE" to confirm' }),
  }),
});

/**
 * Validate invoice IDs schema
 * Pre-flight validation for bulk operations
 */
export const validateInvoiceIdsSchema = z.object({
  invoiceIds: z.array(z.number().int().positive()).min(1),
  operationType: z.enum(['approve', 'reject', 'export', 'delete']),
});
