/**
 * TDS (Tax Deducted at Source) Calculation Utilities
 *
 * Provides helpers for calculating TDS amounts with optional ceiling rounding.
 *
 * Rounding Rules:
 * - Exact: 10% of 51 = 5.10 (no rounding)
 * - Rounded (Ceiling): 10% of 51 = 6.00 (always round UP any decimal)
 */

export interface TdsCalculation {
  /** The TDS amount (either exact or rounded up) */
  tdsAmount: number;
  /** The payable amount after TDS deduction */
  payableAmount: number;
  /** Whether rounding was applied */
  isRounded: boolean;
  /** The exact TDS before rounding (for display purposes) */
  exactTds: number;
}

/**
 * Calculate TDS amount and payable amount
 *
 * @param invoiceAmount - The total invoice amount
 * @param tdsPercentage - The TDS percentage (e.g., 10 for 10%)
 * @param roundUp - Whether to round up the TDS amount (ceiling)
 * @returns TDS calculation result with amounts and rounding info
 *
 * @example
 * // Exact calculation
 * calculateTds(51, 10, false) // { tdsAmount: 5.1, payableAmount: 45.9, ... }
 *
 * // Rounded (ceiling) calculation
 * calculateTds(51, 10, true) // { tdsAmount: 6, payableAmount: 45, ... }
 */
export function calculateTds(
  invoiceAmount: number,
  tdsPercentage: number,
  roundUp: boolean = false
): TdsCalculation {
  // Handle edge cases
  if (invoiceAmount <= 0 || tdsPercentage <= 0) {
    return {
      tdsAmount: 0,
      payableAmount: invoiceAmount,
      isRounded: false,
      exactTds: 0,
    };
  }

  // Calculate exact TDS
  const exactTds = (invoiceAmount * tdsPercentage) / 100;

  // Apply ceiling if rounding is enabled
  const tdsAmount = roundUp ? Math.ceil(exactTds) : exactTds;

  // Calculate payable amount
  const payableAmount = invoiceAmount - tdsAmount;

  return {
    tdsAmount,
    payableAmount,
    isRounded: roundUp && tdsAmount !== exactTds,
    exactTds,
  };
}

/**
 * Check if TDS amount would be different when rounded
 *
 * @param invoiceAmount - The total invoice amount
 * @param tdsPercentage - The TDS percentage
 * @returns true if rounding would change the TDS amount
 */
export function wouldTdsRoundingMakeDifference(
  invoiceAmount: number,
  tdsPercentage: number
): boolean {
  const exactTds = (invoiceAmount * tdsPercentage) / 100;
  return exactTds !== Math.ceil(exactTds);
}

/**
 * Format TDS amount for display
 *
 * @param amount - The amount to format
 * @param currency - Currency symbol (default: '')
 * @returns Formatted string
 */
export function formatTdsAmount(amount: number, currency: string = ''): string {
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency}${formatted}` : formatted;
}

/**
 * Calculate the difference between rounded and exact TDS
 *
 * @param invoiceAmount - The total invoice amount
 * @param tdsPercentage - The TDS percentage
 * @returns The difference (always >= 0)
 */
export function getTdsRoundingDifference(
  invoiceAmount: number,
  tdsPercentage: number
): number {
  const exactTds = (invoiceAmount * tdsPercentage) / 100;
  const roundedTds = Math.ceil(exactTds);
  return roundedTds - exactTds;
}
