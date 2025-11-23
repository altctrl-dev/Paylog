/**
 * Formatting Utilities
 *
 * Helper functions for formatting data for display.
 */

/**
 * Format file size from bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "200 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format date to localized string
 * @param date - Date to format
 * @param includeTime - Include time in output (default: false)
 * @returns Formatted date string (e.g., "Oct 15, 2025" or "Oct 15, 2025, 3:30 PM")
 */
export function formatDate(date: Date | string | null | undefined, includeTime = false): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }

  return d.toLocaleDateString('en-US', options);
}

/**
 * Format date to relative time string
 * @param date - Date to format
 * @returns Relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  // For older dates, show the full date
  return formatDate(d);
}

/**
 * Format currency amount with proper symbol and formatting
 * @param amount - Amount to format
 * @param currencyCode - Currency code (ISO 4217, e.g., 'USD', 'INR', 'EUR', 'GBP')
 * @returns Formatted currency string with correct symbol (e.g., "$1,234.56", "₹1,234.56", "€1,234.56")
 *
 * @example
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 * formatCurrency(1234.56, 'INR') // "₹1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 * formatCurrency(1234.56, 'GBP') // "£1,234.56"
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  // Default to USD if no currency code provided
  let currency = currencyCode || 'USD';

  // Defensive: Map common invalid country codes to currency codes
  const countryToCurrency: Record<string, string> = {
    'IN': 'INR', // India country code -> Indian Rupee
    'US': 'USD', // United States
    'GB': 'GBP', // Great Britain
    'EU': 'EUR', // European Union (not a valid country code, but handle it)
    'JP': 'JPY', // Japan
    'CN': 'CNY', // China
  };

  // Fix common mistakes: country code instead of currency code
  if (currency in countryToCurrency) {
    console.warn(`[formatCurrency] Invalid currency code "${currency}" detected, using "${countryToCurrency[currency]}" instead`);
    currency = countryToCurrency[currency];
  }

  // Use appropriate locale based on currency for better formatting
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'INR': 'en-IN',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
  };

  const locale = localeMap[currency] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback: if currency is still invalid, format as USD with a prefix
    console.error(`[formatCurrency] Invalid currency code "${currency}":`, error);
    const formattedUSD = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    // Replace $ with the invalid currency code to preserve intent
    return formattedUSD.replace('$', `${currency} `);
  }
}

/**
 * Format number with commas
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}
