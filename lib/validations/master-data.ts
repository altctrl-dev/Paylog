/**
 * Master Data Validation Schemas
 *
 * Zod validation schemas for vendor and category CRUD operations.
 * Follows patterns from lib/validations/invoice.ts
 */

import { z } from 'zod';

// ============================================================================
// VENDOR VALIDATION
// ============================================================================

/**
 * Vendor create/update validation schema
 * - Name: required, 1-100 chars
 * - Address: optional, text
 * - GST Exemption: boolean
 * - Bank Details: optional, max 1000 chars
 * - Case-insensitive uniqueness enforced at server action level
 */
export const vendorFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Vendor name is required')
    .max(100, 'Vendor name too long')
    .trim(),
  address: z.string().optional(),
  gst_exemption: z.boolean(),
  bank_details: z
    .string()
    .max(1000, 'Bank details must not exceed 1000 characters')
    .optional(),
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;

/**
 * Vendor search/filter schema
 */
export const vendorFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(20),
});

export type VendorFilters = z.infer<typeof vendorFiltersSchema>;

// ============================================================================
// CATEGORY VALIDATION
// ============================================================================

/**
 * Category create/update validation schema
 * - Name: required, 1-100 chars
 * - Description: required, min 1 char (matches database constraint)
 * - Case-insensitive uniqueness enforced at server action level
 */
export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long')
    .trim(),
  description: z
    .string()
    .min(1, 'Description is required')
    .trim(),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

/**
 * Category search/filter schema
 */
export const categoryFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(20),
});

export type CategoryFilters = z.infer<typeof categoryFiltersSchema>;

// ============================================================================
// ENTITY VALIDATION (Sprint 9A Phase 5-8)
// ============================================================================

/**
 * Entity create/update validation schema
 * - Name: required, 1-255 chars
 * - Description: optional, text
 * - Address: required, min 1 char
 * - Country: required, 2-char uppercase ISO 3166-1 alpha-2
 * - is_active: boolean, default true
 */
export const entityFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Entity name is required')
    .max(255, 'Entity name too long')
    .trim(),
  description: z.string().optional(),
  address: z
    .string()
    .min(1, 'Address is required')
    .trim(),
  country: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .regex(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters (e.g., US, IN, GB)')
    .toUpperCase(),
  is_active: z.boolean(),
});

export type EntityFormData = z.infer<typeof entityFormSchema>;

/**
 * Entity search/filter schema
 */
export const entityFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
  country: z.string().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(20),
});

export type EntityFilters = z.infer<typeof entityFiltersSchema>;

// ============================================================================
// INVOICE PROFILE VALIDATION (Sprint 9B Phase 1)
// ============================================================================

/**
 * InvoiceProfile create/update validation schema
 * - Name: required, 1-100 chars
 * - Description: optional, text
 * - Entity: required foreign key reference
 * - Vendor: required foreign key reference
 * - Category: required foreign key reference
 * - Currency: required foreign key reference
 * - Prepaid/Postpaid: optional enum ('prepaid' | 'postpaid')
 * - TDS Applicable: boolean, default false
 * - TDS Percentage: 0-100, required if tds_applicable=true
 */
export const invoiceProfileFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Profile name is required')
      .max(100, 'Profile name too long')
      .trim(),
    description: z.string().optional(),
    entity_id: z
      .number()
      .int()
      .positive('Entity is required'),
    vendor_id: z
      .number()
      .int()
      .positive('Vendor is required'),
    category_id: z
      .number()
      .int()
      .positive('Category is required'),
    currency_id: z
      .number()
      .int()
      .positive('Currency is required'),
    prepaid_postpaid: z
      .enum(['prepaid', 'postpaid'], {
        errorMap: () => ({ message: 'Must be either "prepaid" or "postpaid"' }),
      })
      .optional(),
    tds_applicable: z.boolean(),
    tds_percentage: z
      .number()
      .min(0, 'TDS percentage cannot be negative')
      .max(100, 'TDS percentage cannot exceed 100')
      .optional(),
  })
  .refine(
    (data) => {
      // If TDS applicable, percentage is required
      if (data.tds_applicable && (data.tds_percentage === undefined || data.tds_percentage === null)) {
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
      // If TDS not applicable, percentage should not be set
      if (!data.tds_applicable && data.tds_percentage !== undefined && data.tds_percentage !== null) {
        return false;
      }
      return true;
    },
    {
      message: 'TDS percentage should not be set when TDS is not applicable',
      path: ['tds_percentage'],
    }
  );

export type InvoiceProfileFormData = z.infer<typeof invoiceProfileFormSchema>;

/**
 * InvoiceProfile search/filter schema
 */
export const invoiceProfileFiltersSchema = z.object({
  search: z.string().optional(),
  entity_id: z.number().int().positive().optional(),
  vendor_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  currency_id: z.number().int().positive().optional(),
  prepaid_postpaid: z.enum(['prepaid', 'postpaid']).optional(),
  tds_applicable: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(20),
});

export type InvoiceProfileFilters = z.infer<typeof invoiceProfileFiltersSchema>;
