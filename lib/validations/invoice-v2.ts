/**
 * Invoice V2 Validation Schemas
 *
 * Zod validation schemas for the new invoice workflow system (Sprint 13).
 * Supports both recurring and non-recurring invoice types with inline payment tracking.
 */

import { z } from 'zod';

// ============================================================================
// RECURRING INVOICE VALIDATION
// ============================================================================

/**
 * Recurring Invoice Form Schema
 *
 * Used for invoices created from invoice profiles.
 * Vendor, entity, category are locked and loaded from profile.
 * File upload is mandatory.
 */
export const recurringInvoiceSchema = z
  .object({
    // File upload (mandatory for recurring)
    file: z
      .instanceof(File, { message: 'Invoice file is required' })
      .refine((file) => file.size > 0, 'Invoice file is required')
      .refine(
        (file) => file.size <= 10485760, // 10MB
        'File size must be less than 10MB'
      )
      .refine(
        (file) =>
          [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ].includes(file.type),
        'File must be PDF, PNG, JPG, or DOCX'
      ),

    // Invoice Profile (mandatory, drives vendor/entity/category)
    invoice_profile_id: z.number().int().positive('Invoice profile is required'),

    // Description (optional)
    brief_description: z.string().max(500, 'Description too long').optional().nullable(),

    // Invoice details
    invoice_number: z
      .string()
      .min(1, 'Invoice number is required')
      .max(100, 'Invoice number too long'),
    invoice_date: z.date({
      required_error: 'Invoice date is required',
      invalid_type_error: 'Invalid date format',
    }),
    due_date: z.date({
      required_error: 'Due date is required',
      invalid_type_error: 'Invalid date format',
    }),
    invoice_received_date: z
      .date({
        invalid_type_error: 'Invalid date format',
      })
      .nullable()
      .optional(),

    // Period (mandatory for recurring)
    period_start: z.date({
      required_error: 'Period start date is required',
      invalid_type_error: 'Invalid date format',
    }),
    period_end: z.date({
      required_error: 'Period end date is required',
      invalid_type_error: 'Invalid date format',
    }),

    // Amount & Currency
    currency_id: z.number().int().positive('Currency is required'),
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),

    // TDS (loaded from profile, but editable)
    tds_applicable: z.boolean(),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .nullable()
      .optional(),

    // Inline payment fields (optional)
    is_paid: z.boolean().default(false),
    paid_date: z
      .date({
        invalid_type_error: 'Invalid date format',
      })
      .nullable()
      .optional(),
    paid_amount: z.number().positive('Paid amount must be greater than 0').nullable().optional(),
    paid_currency: z.string().max(3, 'Currency code too long').nullable().optional(),
    payment_type_id: z.number().int().positive('Payment type is required').nullable().optional(),
    payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),

    // TDS rounding for inline payments
    tds_rounded: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date
      return data.due_date >= data.invoice_date;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  )
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
      // Validation: if TDS is applicable, percentage is required
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
      // Validation: if is_paid = true, payment fields are required
      if (data.is_paid) {
        return !!(data.paid_date && data.paid_amount && data.paid_currency && data.payment_type_id);
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is marked as paid',
      path: ['is_paid'],
    }
  );

/**
 * Type inference from Zod schema
 */
export type RecurringInvoiceFormData = z.infer<typeof recurringInvoiceSchema>;

// ============================================================================
// SERIALIZED SCHEMAS (for React Query with Server Actions)
// ============================================================================

/**
 * Serialized file format for transmission across client-server boundary
 */
const serializedFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  type: z.string().min(1, 'File type is required'),
  size: z.number().int().positive('File size must be positive'),
  data: z.string().min(1, 'File data is required'), // base64 encoded
});

/**
 * Recurring Invoice Serialized Schema
 *
 * Used when submitting via React Query mutations.
 * Files are base64-encoded, dates are ISO strings.
 */
export const recurringInvoiceSerializedSchema = z
  .object({
    // File upload (mandatory for recurring) - serialized format
    file: serializedFileSchema
      .refine((file) => file.size > 0, 'Invoice file is required')
      .refine(
        (file) => file.size <= 10485760, // 10MB
        'File size must be less than 10MB'
      )
      .refine(
        (file) =>
          [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ].includes(file.type),
        'File must be PDF, PNG, JPG, or DOCX'
      ),

    // Invoice Profile (mandatory, drives vendor/entity/category)
    invoice_profile_id: z.number().int().positive('Invoice profile is required'),

    // Description (optional)
    brief_description: z.string().max(500, 'Description too long').optional().nullable(),

    // Invoice details
    invoice_number: z
      .string()
      .min(1, 'Invoice number is required')
      .max(100, 'Invoice number too long'),
    invoice_date: z.string().min(1, 'Invoice date is required'), // ISO string
    due_date: z.string().min(1, 'Due date is required'), // ISO string
    invoice_received_date: z.string().nullable().optional(), // ISO string

    // Period (mandatory for recurring)
    period_start: z.string().min(1, 'Period start date is required'), // ISO string
    period_end: z.string().min(1, 'Period end date is required'), // ISO string

    // Amount & Currency
    currency_id: z.number().int().positive('Currency is required'),
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),

    // TDS (loaded from profile, but editable)
    tds_applicable: z.boolean(),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .nullable()
      .optional(),

    // Inline payment fields (optional)
    is_paid: z.boolean().default(false),
    paid_date: z.string().nullable().optional(), // ISO string
    paid_amount: z.number().positive('Paid amount must be greater than 0').nullable().optional(),
    paid_currency: z.string().max(3, 'Currency code too long').nullable().optional(),
    payment_type_id: z.number().int().positive('Payment type is required').nullable().optional(),
    payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),

    // TDS rounding for inline payments
    tds_rounded: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date
      const invoiceDate = new Date(data.invoice_date);
      const dueDate = new Date(data.due_date);
      return dueDate >= invoiceDate;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  )
  .refine(
    (data) => {
      // Validation: period_end must be >= period_start
      const periodStart = new Date(data.period_start);
      const periodEnd = new Date(data.period_end);
      return periodEnd >= periodStart;
    },
    {
      message: 'Period end date must be after or equal to period start date',
      path: ['period_end'],
    }
  )
  .refine(
    (data) => {
      // Validation: if TDS is applicable, percentage is required
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
      // Validation: if is_paid = true, payment fields are required
      if (data.is_paid) {
        return !!(data.paid_date && data.paid_amount && data.paid_currency && data.payment_type_id);
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is marked as paid',
      path: ['is_paid'],
    }
  );

/**
 * Type inference from serialized schema
 */
export type RecurringInvoiceSerializedData = z.infer<typeof recurringInvoiceSerializedSchema>;

// ============================================================================
// NON-RECURRING INVOICE VALIDATION
// ============================================================================

/**
 * Non-Recurring Invoice Form Schema
 *
 * Used for one-off invoices without profile association.
 * All fields are manually entered and editable.
 * File upload is optional (with warning).
 */
export const nonRecurringInvoiceSchema = z
  .object({
    // File upload (optional for non-recurring, but with warning)
    file: z
      .instanceof(File)
      .refine(
        (file) => !file || file.size <= 10485760, // 10MB
        'File size must be less than 10MB'
      )
      .refine(
        (file) =>
          !file ||
          [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ].includes(file.type),
        'File must be PDF, PNG, JPG, or DOCX'
      )
      .nullable()
      .optional(),

    // Invoice Name (mandatory for non-recurring)
    invoice_name: z.string().min(1, 'Invoice name is required').max(200, 'Invoice name too long'),

    // Description (optional)
    brief_description: z.string().max(500, 'Description too long').optional().nullable(),

    // Vendor (mandatory, use VendorTextAutocomplete - can be 0 for new vendors)
    vendor_id: z.number().int().nonnegative('Vendor must be selected or entered'),

    // Entity (mandatory, default ID=1)
    entity_id: z.number().int().positive('Entity is required').default(1),

    // Category (mandatory)
    category_id: z.number().int().positive('Category is required'),

    // Invoice details (invoice_number can be empty if invoice_pending is true)
    invoice_number: z
      .string()
      .max(100, 'Invoice number too long'),
    invoice_date: z
      .date({
        required_error: 'Invoice date is required',
        invalid_type_error: 'Invalid date format',
      })
      .default(() => new Date()),
    due_date: z
      .date({
        required_error: 'Due date is required',
        invalid_type_error: 'Invalid date format',
      })
      .default(() => new Date()), // Default to invoice_date if not explicitly set
    invoice_received_date: z
      .date({
        invalid_type_error: 'Invalid date format',
      })
      .nullable()
      .optional(),

    // Amount & Currency
    currency_id: z.number().int().positive('Currency is required').default(1), // Default INR
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),

    // TDS (default toggle = No)
    tds_applicable: z.boolean().default(false),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .nullable()
      .optional(),

    // Inline payment fields (optional, but required if invoice_pending is true)
    is_paid: z.boolean().default(false),
    paid_date: z
      .date({
        invalid_type_error: 'Invalid date format',
      })
      .nullable()
      .optional(),
    paid_amount: z.number().positive('Paid amount must be greater than 0').nullable().optional(),
    paid_currency: z.string().max(3, 'Currency code too long').nullable().optional(),
    payment_type_id: z.number().int().positive('Payment type is required').nullable().optional(),
    payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),

    // TDS rounding for inline payments
    tds_rounded: z.boolean().optional().default(false),

    // Invoice pending mode - payment recorded before invoice received
    invoice_pending: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date (skip for pending invoices)
      if (data.invoice_pending) return true; // Skip for pending invoices
      return data.due_date >= data.invoice_date;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  )
  .refine(
    (data) => {
      // Validation: if TDS is applicable, percentage is required
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
      // Validation: if is_paid = true, payment fields are required
      if (data.is_paid) {
        return !!(data.paid_date && data.paid_amount && data.paid_currency && data.payment_type_id);
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is marked as paid',
      path: ['is_paid'],
    }
  )
  .refine(
    (data) => {
      // Validation: invoice_number is required unless invoice_pending is true
      if (!data.invoice_pending && (!data.invoice_number || data.invoice_number.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Invoice number is required',
      path: ['invoice_number'],
    }
  )
  .refine(
    (data) => {
      // Validation: if invoice_pending is true, payment is required
      if (data.invoice_pending && !data.is_paid) {
        return false;
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is pending',
      path: ['is_paid'],
    }
  );

/**
 * Type inference from Zod schema
 */
export type NonRecurringInvoiceFormData = z.infer<typeof nonRecurringInvoiceSchema>;

/**
 * Non-Recurring Invoice Serialized Schema
 *
 * Used when submitting via React Query mutations.
 * Files are base64-encoded, dates are ISO strings.
 */
export const nonRecurringInvoiceSerializedSchema = z
  .object({
    // File upload (optional for non-recurring) - serialized format
    file: serializedFileSchema
      .refine(
        (file) => !file || file.size <= 10485760, // 10MB
        'File size must be less than 10MB'
      )
      .refine(
        (file) =>
          !file ||
          [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ].includes(file.type),
        'File must be PDF, PNG, JPG, or DOCX'
      )
      .nullable()
      .optional(),

    // Invoice Name (mandatory for non-recurring)
    invoice_name: z.string().min(1, 'Invoice name is required').max(200, 'Invoice name too long'),

    // Description (optional)
    brief_description: z.string().max(500, 'Description too long').optional().nullable(),

    // Vendor (mandatory, use VendorTextAutocomplete - can be 0 for new vendors)
    vendor_id: z.number().int().nonnegative('Vendor must be selected or entered'),

    // Entity (mandatory, default ID=1)
    entity_id: z.number().int().positive('Entity is required').default(1),

    // Category (mandatory)
    category_id: z.number().int().positive('Category is required'),

    // Invoice details (invoice_number can be empty if invoice_pending is true)
    invoice_number: z
      .string()
      .max(100, 'Invoice number too long'),
    invoice_date: z.string().min(1, 'Invoice date is required'), // ISO string
    due_date: z.string().min(1, 'Due date is required'), // ISO string - defaults to invoice_date
    invoice_received_date: z.string().nullable().optional(), // ISO string

    // Amount & Currency
    currency_id: z.number().int().positive('Currency is required').default(1), // Default INR
    invoice_amount: z
      .number()
      .min(0.01, 'Amount must be greater than 0')
      .max(999999999, 'Amount too large'),

    // TDS (default toggle = No)
    tds_applicable: z.boolean().default(false),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .nullable()
      .optional(),

    // Inline payment fields (optional, but required if invoice_pending is true)
    is_paid: z.boolean().default(false),
    paid_date: z.string().nullable().optional(), // ISO string
    paid_amount: z.number().positive('Paid amount must be greater than 0').nullable().optional(),
    paid_currency: z.string().max(3, 'Currency code too long').nullable().optional(),
    payment_type_id: z.number().int().positive('Payment type is required').nullable().optional(),
    payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),

    // TDS rounding for inline payments
    tds_rounded: z.boolean().optional().default(false),

    // Invoice pending mode - payment recorded before invoice received
    invoice_pending: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date (skip for pending invoices)
      if (data.invoice_pending) return true; // Skip for pending invoices
      const invoiceDate = new Date(data.invoice_date);
      const dueDate = new Date(data.due_date);
      return dueDate >= invoiceDate;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  )
  .refine(
    (data) => {
      // Validation: if TDS is applicable, percentage is required
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
      // Validation: if is_paid = true, payment fields are required
      if (data.is_paid) {
        return !!(data.paid_date && data.paid_amount && data.paid_currency && data.payment_type_id);
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is marked as paid',
      path: ['is_paid'],
    }
  )
  .refine(
    (data) => {
      // Validation: invoice_number is required unless invoice_pending is true
      if (!data.invoice_pending && (!data.invoice_number || data.invoice_number.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Invoice number is required',
      path: ['invoice_number'],
    }
  )
  .refine(
    (data) => {
      // Validation: if invoice_pending is true, payment is required
      if (data.invoice_pending && !data.is_paid) {
        return false;
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is pending',
      path: ['is_paid'],
    }
  );

/**
 * Type inference from serialized schema
 */
export type NonRecurringInvoiceSerializedData = z.infer<typeof nonRecurringInvoiceSerializedSchema>;

// ============================================================================
// UPDATE SCHEMAS (for Edit Operations)
// ============================================================================

/**
 * Update Recurring Invoice Serialized Schema
 *
 * Similar to create schema but:
 * - File is optional (only required if user wants to replace attachment)
 * - Used for editing existing recurring invoices
 */
const updateRecurringInvoiceSerializedBaseSchema = z.object({
  // File upload (optional for updates) - serialized format
  file: serializedFileSchema
    .refine(
      (file) => file.size <= 10485760, // 10MB
      'File size must be less than 10MB'
    )
    .refine(
      (file) =>
        [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.type),
      'File must be PDF, PNG, JPG, or DOCX'
    )
    .nullable()
    .optional(),

  // Invoice Profile (mandatory, drives vendor/entity/category)
  invoice_profile_id: z.number().int().positive('Invoice profile is required'),

  // Description (optional)
  brief_description: z.string().max(500, 'Description too long').optional().nullable(),

  // Invoice details
  invoice_number: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number too long'),
  invoice_date: z.string().min(1, 'Invoice date is required'), // ISO string
  due_date: z.string().min(1, 'Due date is required'), // ISO string
  invoice_received_date: z.string().nullable().optional(), // ISO string

  // Period (mandatory for recurring)
  period_start: z.string().min(1, 'Period start date is required'), // ISO string
  period_end: z.string().min(1, 'Period end date is required'), // ISO string

  // Amount & Currency
  currency_id: z.number().int().positive('Currency is required'),
  invoice_amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999, 'Amount too large'),

  // TDS (loaded from profile, but editable)
  tds_applicable: z.boolean(),
  tds_percentage: z
    .number()
    .min(0, 'TDS percentage cannot be negative')
    .max(100, 'TDS percentage cannot exceed 100')
    .nullable()
    .optional(),

  // Inline payment fields (optional)
  is_paid: z.boolean().default(false),
  paid_date: z.string().nullable().optional(), // ISO string
  paid_amount: z.number().positive('Paid amount must be greater than 0').nullable().optional(),
  paid_currency: z.string().max(3, 'Currency code too long').nullable().optional(),
  payment_type_id: z.number().int().positive('Payment type is required').nullable().optional(),
  payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),

  // TDS rounding for inline payments
  tds_rounded: z.boolean().optional().default(false),
});

export const updateRecurringInvoiceSerializedSchema = updateRecurringInvoiceSerializedBaseSchema
  .refine(
    (data) => {
      // Validation: due_date must be >= invoice_date
      const invoiceDate = new Date(data.invoice_date);
      const dueDate = new Date(data.due_date);
      return dueDate >= invoiceDate;
    },
    {
      message: 'Due date cannot be before invoice date',
      path: ['due_date'],
    }
  )
  .refine(
    (data) => {
      // Validation: period_end must be >= period_start
      const periodStart = new Date(data.period_start);
      const periodEnd = new Date(data.period_end);
      return periodEnd >= periodStart;
    },
    {
      message: 'Period end date must be after or equal to period start date',
      path: ['period_end'],
    }
  )
  .refine(
    (data) => {
      // Validation: if TDS is applicable, percentage is required
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
      // Validation: if is_paid = true, payment fields are required
      if (data.is_paid) {
        return !!(data.paid_date && data.paid_amount && data.paid_currency && data.payment_type_id);
      }
      return true;
    },
    {
      message: 'Payment details are required when invoice is marked as paid',
      path: ['is_paid'],
    }
  );

/**
 * Type inference from update schema
 */
export type UpdateRecurringInvoiceSerializedData = z.infer<typeof updateRecurringInvoiceSerializedSchema>;

/**
 * Update Non-Recurring Invoice Serialized Schema
 *
 * Similar to create schema but:
 * - File is optional (already optional in create, maintained for updates)
 * - Used for editing existing non-recurring invoices
 */
export const updateNonRecurringInvoiceSerializedSchema = nonRecurringInvoiceSerializedSchema;

/**
 * Type inference from update schema
 */
export type UpdateNonRecurringInvoiceSerializedData = z.infer<typeof updateNonRecurringInvoiceSerializedSchema>;

// ============================================================================
// INVOICE PENDING SCHEMAS (Payment recorded before invoice received)
// ============================================================================

/**
 * Invoice Pending Form Schema
 *
 * Used when recording a payment before receiving the invoice.
 * Invoice details (number, date, due date, file) are skipped.
 * Payment details are required.
 */
export const invoicePendingSchema = z.object({
  // Invoice Name (mandatory - describes what the payment is for)
  invoice_name: z.string().min(1, 'Invoice name is required').max(200, 'Invoice name too long'),

  // Description (optional)
  brief_description: z.string().max(500, 'Description too long').optional().nullable(),

  // Vendor (mandatory)
  vendor_id: z.number().int().positive('Vendor is required'),

  // Entity (mandatory)
  entity_id: z.number().int().positive('Entity is required'),

  // Category (mandatory)
  category_id: z.number().int().positive('Category is required'),

  // Amount & Currency
  currency_id: z.number().int().positive('Currency is required'),
  invoice_amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999, 'Amount too large'),

  // TDS (optional)
  tds_applicable: z.boolean(),
  tds_percentage: z
    .number()
    .min(0, 'TDS percentage cannot be negative')
    .max(100, 'TDS percentage cannot exceed 100')
    .nullable()
    .optional(),
  tds_rounded: z.boolean().optional(),

  // Payment fields (REQUIRED for invoice pending)
  paid_date: z.date({
    required_error: 'Payment date is required',
    invalid_type_error: 'Invalid date format',
  }),
  paid_amount: z.number().positive('Payment amount must be greater than 0'),
  paid_currency: z.string().max(3, 'Currency code too long'),
  payment_type_id: z.number().int().positive('Payment type is required'),
  payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),
}).refine(
  (data) => {
    // Validation: if TDS is applicable, percentage is required
    if (data.tds_applicable && !data.tds_percentage) {
      return false;
    }
    return true;
  },
  {
    message: 'TDS percentage is required when TDS is applicable',
    path: ['tds_percentage'],
  }
);

/**
 * Type inference from Zod schema
 */
export type InvoicePendingFormData = z.infer<typeof invoicePendingSchema>;

/**
 * Invoice Pending Serialized Schema
 *
 * Used when submitting via React Query mutations.
 * Dates are ISO strings.
 */
export const invoicePendingSerializedSchema = z.object({
  // Invoice Name (mandatory)
  invoice_name: z.string().min(1, 'Invoice name is required').max(200, 'Invoice name too long'),

  // Description (optional)
  brief_description: z.string().max(500, 'Description too long').optional().nullable(),

  // Vendor (mandatory)
  vendor_id: z.number().int().positive('Vendor is required'),

  // Entity (mandatory, default ID=1)
  entity_id: z.number().int().positive('Entity is required').default(1),

  // Category (mandatory)
  category_id: z.number().int().positive('Category is required'),

  // Amount & Currency
  currency_id: z.number().int().positive('Currency is required').default(1),
  invoice_amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999, 'Amount too large'),

  // TDS (optional)
  tds_applicable: z.boolean().default(false),
  tds_percentage: z
    .number()
    .min(0, 'TDS percentage cannot be negative')
    .max(100, 'TDS percentage cannot exceed 100')
    .nullable()
    .optional(),
  tds_rounded: z.boolean().optional().default(false),

  // Payment fields (REQUIRED for invoice pending) - ISO strings
  paid_date: z.string().min(1, 'Payment date is required'),
  paid_amount: z.number().positive('Payment amount must be greater than 0'),
  paid_currency: z.string().max(3, 'Currency code too long'),
  payment_type_id: z.number().int().positive('Payment type is required'),
  payment_reference: z.string().max(100, 'Reference too long').nullable().optional(),
}).refine(
  (data) => {
    // Validation: if TDS is applicable, percentage is required
    if (data.tds_applicable && !data.tds_percentage) {
      return false;
    }
    return true;
  },
  {
    message: 'TDS percentage is required when TDS is applicable',
    path: ['tds_percentage'],
  }
);

/**
 * Type inference from serialized schema
 */
export type InvoicePendingSerializedData = z.infer<typeof invoicePendingSerializedSchema>;

/**
 * Complete Invoice Details Schema
 *
 * Used when adding invoice details to an existing pending invoice.
 */
export const completeInvoiceDetailsSchema = z.object({
  // File upload (optional)
  file: z
    .instanceof(File)
    .refine(
      (file) => !file || file.size <= 10485760,
      'File size must be less than 10MB'
    )
    .refine(
      (file) =>
        !file ||
        [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.type),
      'File must be PDF, PNG, JPG, or DOCX'
    )
    .nullable()
    .optional(),

  // Invoice details
  invoice_number: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number too long'),
  invoice_date: z.date({
    required_error: 'Invoice date is required',
    invalid_type_error: 'Invalid date format',
  }),
  due_date: z.date({
    required_error: 'Due date is required',
    invalid_type_error: 'Invalid date format',
  }),
  invoice_received_date: z
    .date({ invalid_type_error: 'Invalid date format' })
    .nullable()
    .optional(),

  // Optional: Update invoice amount if different from payment
  invoice_amount_differs: z.boolean(),
  new_invoice_amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999, 'Amount too large')
    .nullable()
    .optional(),
}).refine(
  (data) => {
    return data.due_date >= data.invoice_date;
  },
  {
    message: 'Due date cannot be before invoice date',
    path: ['due_date'],
  }
);

/**
 * Type inference from schema
 */
export type CompleteInvoiceDetailsFormData = z.infer<typeof completeInvoiceDetailsSchema>;

/**
 * Complete Invoice Details Serialized Schema
 */
export const completeInvoiceDetailsSerializedSchema = z.object({
  // File upload (optional) - serialized format
  file: z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    size: z.number().int().positive(),
    data: z.string().min(1),
  })
    .refine((file) => file.size <= 10485760, 'File size must be less than 10MB')
    .refine(
      (file) =>
        [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.type),
      'File must be PDF, PNG, JPG, or DOCX'
    )
    .nullable()
    .optional(),

  // Invoice details - ISO strings
  invoice_number: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number too long'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  invoice_received_date: z.string().nullable().optional(),

  // Optional: Update invoice amount
  invoice_amount_differs: z.boolean().default(false),
  new_invoice_amount: z
    .number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999, 'Amount too large')
    .nullable()
    .optional(),
}).refine(
  (data) => {
    const invoiceDate = new Date(data.invoice_date);
    const dueDate = new Date(data.due_date);
    return dueDate >= invoiceDate;
  },
  {
    message: 'Due date cannot be before invoice date',
    path: ['due_date'],
  }
);

/**
 * Type inference from serialized schema
 */
export type CompleteInvoiceDetailsSerializedData = z.infer<typeof completeInvoiceDetailsSerializedSchema>;
