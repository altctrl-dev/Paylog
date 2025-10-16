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
 * - Case-insensitive uniqueness enforced at server action level
 */
export const vendorFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Vendor name is required')
    .max(100, 'Vendor name too long')
    .trim(),
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
 * - Case-insensitive uniqueness enforced at server action level
 */
export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long')
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
