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
