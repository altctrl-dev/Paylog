/**
 * Payment Validation Schemas
 *
 * Zod validation schemas for payment operations.
 * Extracted from types/payment.ts for better separation of concerns.
 */

import { z } from 'zod';
import { PAYMENT_STATUS, PAYMENT_METHOD } from '@/types/payment';

// ============================================================================
// PAYMENT FORM VALIDATION
// ============================================================================

/**
 * Payment form validation schema
 * Used for create operations
 *
 * IMPORTANT: Payment date is REQUIRED (not nullable)
 * - Form will enforce date selection
 * - Amount must be positive and within valid range
 */
export const paymentFormSchema = z
  .object({
    amount_paid: z
      .number({
        required_error: 'Payment amount is required',
        invalid_type_error: 'Amount must be a number',
      })
      .positive('Amount must be greater than 0')
      .max(999999999, 'Amount too large')
      .refine(
        (val) => {
          // Check max 2 decimal places
          const decimals = val.toString().split('.')[1];
          return !decimals || decimals.length <= 2;
        },
        {
          message: 'Amount can have maximum 2 decimal places',
        }
      ),
    payment_date: z.date({
      required_error: 'Payment date is required',
      invalid_type_error: 'Invalid date format',
    }),
    payment_method: z.enum(
      [
        PAYMENT_METHOD.CASH,
        PAYMENT_METHOD.CHECK,
        PAYMENT_METHOD.WIRE_TRANSFER,
        PAYMENT_METHOD.CARD,
        PAYMENT_METHOD.UPI,
        PAYMENT_METHOD.OTHER,
      ],
      {
        required_error: 'Payment method is required',
        invalid_type_error: 'Invalid payment method',
      }
    ),
  })
  .refine(
    (data) => {
      // Payment date cannot be in the future
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return data.payment_date <= today;
    },
    {
      message: 'Payment date cannot be in the future',
      path: ['payment_date'],
    }
  );

/**
 * Type inference from Zod schema
 */
export type PaymentFormData = z.infer<typeof paymentFormSchema>;

// ============================================================================
// PAYMENT LIST FILTERS
// ============================================================================

/**
 * Payment list filters
 */
export const paymentFiltersSchema = z.object({
  invoice_id: z.number().int().positive().optional(),
  status: z
    .enum([
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.APPROVED,
      PAYMENT_STATUS.REJECTED,
    ])
    .optional(),
  payment_method: z
    .enum([
      PAYMENT_METHOD.CASH,
      PAYMENT_METHOD.CHECK,
      PAYMENT_METHOD.WIRE_TRANSFER,
      PAYMENT_METHOD.CARD,
      PAYMENT_METHOD.UPI,
      PAYMENT_METHOD.OTHER,
    ])
    .optional(),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().default(20),
});

export type PaymentFilters = z.infer<typeof paymentFiltersSchema>;
