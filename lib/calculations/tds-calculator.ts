/**
 * TDS Calculator (Sprint 13)
 *
 * Tax Deducted at Source (TDS) calculation utilities.
 * Handles percentage validation and amount calculations.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum TDS percentage (0%)
 */
const MIN_TDS_PERCENTAGE = 0;

/**
 * Maximum TDS percentage (100%)
 */
const MAX_TDS_PERCENTAGE = 100;

/**
 * Decimal places for rounding
 */
const DECIMAL_PLACES = 2;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate TDS percentage
 *
 * Checks if percentage is between 0 and 100.
 *
 * @param percentage - TDS percentage to validate
 * @returns true if valid, false otherwise
 */
export function validateTDSPercentage(percentage: number): boolean {
  // Check if number
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return false;
  }

  // Check range
  return percentage >= MIN_TDS_PERCENTAGE && percentage <= MAX_TDS_PERCENTAGE;
}

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate TDS amount from invoice amount and percentage
 *
 * Formula: TDS Amount = Invoice Amount × (TDS Percentage ÷ 100)
 *
 * @param invoiceAmount - Invoice amount (before TDS)
 * @param tdsPercentage - TDS percentage (0-100)
 * @returns TDS amount (rounded to 2 decimal places)
 * @throws Error if inputs are invalid
 */
export function calculateTDSAmount(
  invoiceAmount: number,
  tdsPercentage: number
): number {
  // Validate inputs
  if (typeof invoiceAmount !== 'number' || isNaN(invoiceAmount) || invoiceAmount < 0) {
    throw new Error('Invalid invoice amount. Must be a positive number.');
  }

  if (!validateTDSPercentage(tdsPercentage)) {
    throw new Error(
      `Invalid TDS percentage. Must be between ${MIN_TDS_PERCENTAGE} and ${MAX_TDS_PERCENTAGE}.`
    );
  }

  // Calculate TDS amount
  const tdsAmount = invoiceAmount * (tdsPercentage / 100);

  // Round to 2 decimal places
  return roundToDecimalPlaces(tdsAmount, DECIMAL_PLACES);
}

/**
 * Calculate net amount after TDS deduction
 *
 * Formula: Net Amount = Invoice Amount - TDS Amount
 *
 * @param invoiceAmount - Invoice amount (before TDS)
 * @param tdsAmount - TDS amount (calculated or provided)
 * @returns Net amount after TDS deduction (rounded to 2 decimal places)
 * @throws Error if inputs are invalid
 */
export function calculateNetAmount(
  invoiceAmount: number,
  tdsAmount: number
): number {
  // Validate inputs
  if (typeof invoiceAmount !== 'number' || isNaN(invoiceAmount) || invoiceAmount < 0) {
    throw new Error('Invalid invoice amount. Must be a positive number.');
  }

  if (typeof tdsAmount !== 'number' || isNaN(tdsAmount) || tdsAmount < 0) {
    throw new Error('Invalid TDS amount. Must be a positive number.');
  }

  if (tdsAmount > invoiceAmount) {
    throw new Error('TDS amount cannot exceed invoice amount.');
  }

  // Calculate net amount
  const netAmount = invoiceAmount - tdsAmount;

  // Round to 2 decimal places
  return roundToDecimalPlaces(netAmount, DECIMAL_PLACES);
}

/**
 * Calculate TDS percentage from amounts
 *
 * Formula: TDS Percentage = (TDS Amount ÷ Invoice Amount) × 100
 *
 * Useful for reverse calculation or validation.
 *
 * @param invoiceAmount - Invoice amount (before TDS)
 * @param tdsAmount - TDS amount deducted
 * @returns TDS percentage (rounded to 2 decimal places)
 * @throws Error if inputs are invalid
 */
export function calculateTDSPercentage(
  invoiceAmount: number,
  tdsAmount: number
): number {
  // Validate inputs
  if (typeof invoiceAmount !== 'number' || isNaN(invoiceAmount) || invoiceAmount <= 0) {
    throw new Error('Invalid invoice amount. Must be a positive number greater than zero.');
  }

  if (typeof tdsAmount !== 'number' || isNaN(tdsAmount) || tdsAmount < 0) {
    throw new Error('Invalid TDS amount. Must be a positive number.');
  }

  if (tdsAmount > invoiceAmount) {
    throw new Error('TDS amount cannot exceed invoice amount.');
  }

  // Calculate percentage
  const percentage = (tdsAmount / invoiceAmount) * 100;

  // Round to 2 decimal places
  return roundToDecimalPlaces(percentage, DECIMAL_PLACES);
}

/**
 * Calculate complete TDS breakdown
 *
 * Returns invoice amount, TDS amount, and net amount.
 *
 * @param invoiceAmount - Invoice amount (before TDS)
 * @param tdsPercentage - TDS percentage (0-100)
 * @returns TDS breakdown object
 * @throws Error if inputs are invalid
 */
export function calculateTDSBreakdown(
  invoiceAmount: number,
  tdsPercentage: number
): {
  invoiceAmount: number;
  tdsPercentage: number;
  tdsAmount: number;
  netAmount: number;
} {
  // Calculate TDS amount
  const tdsAmount = calculateTDSAmount(invoiceAmount, tdsPercentage);

  // Calculate net amount
  const netAmount = calculateNetAmount(invoiceAmount, tdsAmount);

  return {
    invoiceAmount: roundToDecimalPlaces(invoiceAmount, DECIMAL_PLACES),
    tdsPercentage: roundToDecimalPlaces(tdsPercentage, DECIMAL_PLACES),
    tdsAmount,
    netAmount,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Round number to specified decimal places
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
function roundToDecimalPlaces(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Format currency amount for display
 *
 * @param amount - Amount to format
 * @param currencySymbol - Currency symbol (default: ₹)
 * @returns Formatted string (e.g., "₹1,234.56")
 */
export function formatCurrencyAmount(
  amount: number,
  currencySymbol: string = '₹'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${currencySymbol}0.00`;
  }

  const rounded = roundToDecimalPlaces(amount, DECIMAL_PLACES);
  const formatted = rounded.toLocaleString('en-IN', {
    minimumFractionDigits: DECIMAL_PLACES,
    maximumFractionDigits: DECIMAL_PLACES,
  });

  return `${currencySymbol}${formatted}`;
}

/**
 * Format TDS percentage for display
 *
 * @param percentage - Percentage to format
 * @returns Formatted string (e.g., "10.00%")
 */
export function formatTDSPercentage(percentage: number): string {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return '0.00%';
  }

  const rounded = roundToDecimalPlaces(percentage, DECIMAL_PLACES);
  return `${rounded.toFixed(DECIMAL_PLACES)}%`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TDS_CONFIG = {
  MIN_PERCENTAGE: MIN_TDS_PERCENTAGE,
  MAX_PERCENTAGE: MAX_TDS_PERCENTAGE,
  DECIMAL_PLACES,
} as const;
