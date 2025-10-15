/**
 * Email Configuration
 * Central configuration for email service behavior
 */

/**
 * Email service configuration
 */
export const emailConfig = {
  /**
   * Whether email sending is enabled
   * Set to false to disable all email operations (useful for development)
   */
  enabled: process.env.EMAIL_ENABLED === 'true',

  /**
   * Number of retry attempts for failed email sends
   */
  retryAttempts: 3,

  /**
   * Initial delay between retry attempts (in milliseconds)
   * Subsequent retries use exponential backoff
   */
  retryDelay: 1000,

  /**
   * Timeout for each email send operation (in milliseconds)
   */
  timeout: 5000,

  /**
   * Preview mode - log emails to console instead of sending
   * Useful for development and testing
   */
  preview: process.env.EMAIL_PREVIEW === 'true',
} as const;

/**
 * Validate that required environment variables are set
 * @throws Error if critical configuration is missing
 */
export function validateEmailConfig(): void {
  if (emailConfig.enabled && !emailConfig.preview) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        'EMAIL_ENABLED is true but RESEND_API_KEY is not set. Please configure your Resend API key.',
      );
    }

    if (!process.env.EMAIL_FROM) {
      throw new Error(
        'EMAIL_ENABLED is true but EMAIL_FROM is not set. Please configure your sender email address.',
      );
    }

    if (!process.env.ADMIN_EMAILS) {
      console.warn(
        'Warning: ADMIN_EMAILS is not set. Admin notifications will not be sent.',
      );
    }
  }
}
