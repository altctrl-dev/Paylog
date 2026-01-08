/**
 * Email Service
 * Handles all email operations with retry logic and error handling
 */

import { Resend } from 'resend';
import { emailConfig } from './config';
import type {
  EmailOptions,
  EmailResult,
  NewRequestTemplateData,
  ApprovalTemplateData,
  RejectionTemplateData,
} from './types';

/**
 * Utility to sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * EmailService class for sending transactional emails
 * Implements retry logic with exponential backoff
 */
export class EmailService {
  private resend: Resend | null;
  private from: string;
  private adminEmails: string[];

  constructor() {
    // Defensive initialization - don't throw if API key is missing
    // This allows the module to load successfully even without valid credentials
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;

    this.from = process.env.EMAIL_FROM || 'PayLog <noreply@servesys.co>';
    this.adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];

    // Debug logging to verify environment variables are loaded
    console.log('[Email] Service initialized:', {
      hasApiKey: !!apiKey,
      from: this.from,
      adminEmails: this.adminEmails,
      envAdminEmails: process.env.ADMIN_EMAILS,
    });
  }

  /**
   * Send email with retry logic and exponential backoff
   * @param options Email options
   * @returns Promise resolving to EmailResult
   */
  private async sendWithRetry(options: EmailOptions): Promise<EmailResult> {
    // Early check: fail gracefully if service is not configured
    if (!this.resend || !emailConfig.enabled) {
      console.log('[Email] Service not configured or disabled, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    // Preview mode - log to console instead of sending
    if (emailConfig.preview) {
      console.log('[Email Preview]', {
        to: options.to,
        subject: options.subject,
        from: this.from,
        htmlLength: options.html.length,
        textLength: options.text?.length || 0,
      });
      return { success: true, messageId: 'preview-mode' };
    }

    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= emailConfig.retryAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), emailConfig.timeout);

        // Send email via Resend
        const result = await this.resend.emails.send({
          from: this.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
        });

        clearTimeout(timeoutId);

        // Check for errors in result
        if (result.error) {
          throw new Error(result.error.message || 'Email sending failed');
        }

        // Success - return result
        console.log(`[Email] Successfully sent email to ${options.to}`, {
          messageId: result.data.id,
          attempt,
        });

        return {
          success: true,
          messageId: result.data.id,
        };
      } catch (error) {
        lastError = error as Error;

        // Log error without exposing sensitive data
        console.error(`[Email] Attempt ${attempt}/${emailConfig.retryAttempts} failed:`, {
          error: lastError.message,
          to: options.to,
          subject: options.subject,
        });

        // If not the last attempt, wait with exponential backoff
        if (attempt < emailConfig.retryAttempts) {
          const backoffDelay = emailConfig.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[Email] Retrying in ${backoffDelay}ms...`);
          await sleep(backoffDelay);
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
    };
  }

  /**
   * Send notification email when a new master data request is created
   * Sends to admin users for review
   * @param data Request data for the email template
   */
  async sendNewRequestNotification(
    data: NewRequestTemplateData,
  ): Promise<EmailResult> {
    if (this.adminEmails.length === 0) {
      console.warn('[Email] No admin emails configured, skipping notification');
      return { success: false, error: 'No admin emails configured' };
    }

    const subject = `New ${data.requestType} Request - #${data.requestId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #1a1a1a;">New Master Data Request</h1>
            <p style="margin: 0; color: #6c757d;">A new request requires your review</p>
          </div>

          <div style="background-color: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Request ID:</td>
                <td style="padding: 8px 0;">#${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Request Type:</td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Requested By:</td>
                <td style="padding: 8px 0;">${data.requesterName} (${data.requesterEmail})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Submitted:</td>
                <td style="padding: 8px 0;">${data.submittedAt.toLocaleDateString()} at ${data.submittedAt.toLocaleTimeString()}</td>
              </tr>
              ${
                data.description
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600; vertical-align: top;">Description:</td>
                <td style="padding: 8px 0;">${data.description}</td>
              </tr>
              `
                  : ''
              }
            </table>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              Please log in to the system to review and process this request.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
New Master Data Request

Request ID: #${data.requestId}
Request Type: ${data.requestType}
Requested By: ${data.requesterName} (${data.requesterEmail})
Submitted: ${data.submittedAt.toLocaleDateString()} at ${data.submittedAt.toLocaleTimeString()}
${data.description ? `\nDescription: ${data.description}` : ''}

Please log in to the system to review and process this request.
    `.trim();

    return this.sendWithRetry({
      to: this.adminEmails,
      subject,
      html,
      text,
      replyTo: data.requesterEmail,
    });
  }

  /**
   * Send notification email when a request is approved
   * Sends to the requester
   * @param requesterEmail Email of the user who submitted the request
   * @param data Approval data for the email template
   */
  async sendApprovalNotification(
    requesterEmail: string,
    data: ApprovalTemplateData,
  ): Promise<EmailResult> {
    const subject = `Request Approved - #${data.requestId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #d1f4e0; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #0f5132;">Request Approved</h1>
            <p style="margin: 0; color: #0f5132;">Your master data request has been approved</p>
          </div>

          <div style="background-color: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Request ID:</td>
                <td style="padding: 8px 0;">#${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Request Type:</td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Approved By:</td>
                <td style="padding: 8px 0;">${data.approverName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Approved:</td>
                <td style="padding: 8px 0;">${data.approvedAt.toLocaleDateString()} at ${data.approvedAt.toLocaleTimeString()}</td>
              </tr>
              ${
                data.comments
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600; vertical-align: top;">Comments:</td>
                <td style="padding: 8px 0;">${data.comments}</td>
              </tr>
              `
                  : ''
              }
            </table>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              The changes have been applied to the system.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Request Approved

Request ID: #${data.requestId}
Request Type: ${data.requestType}
Approved By: ${data.approverName}
Approved: ${data.approvedAt.toLocaleDateString()} at ${data.approvedAt.toLocaleTimeString()}
${data.comments ? `\nComments: ${data.comments}` : ''}

The changes have been applied to the system.
    `.trim();

    return this.sendWithRetry({
      to: requesterEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send notification email when a request is rejected
   * Sends to the requester
   * @param requesterEmail Email of the user who submitted the request
   * @param data Rejection data for the email template
   */
  async sendRejectionNotification(
    requesterEmail: string,
    data: RejectionTemplateData,
  ): Promise<EmailResult> {
    const subject = `Request Rejected - #${data.requestId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8d7da; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #842029;">Request Rejected</h1>
            <p style="margin: 0; color: #842029;">Your master data request was not approved</p>
          </div>

          <div style="background-color: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Request ID:</td>
                <td style="padding: 8px 0;">#${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Request Type:</td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Reviewed By:</td>
                <td style="padding: 8px 0;">${data.reviewerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Rejected:</td>
                <td style="padding: 8px 0;">${data.rejectedAt.toLocaleDateString()} at ${data.rejectedAt.toLocaleTimeString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d; font-weight: 600; vertical-align: top;">Reason:</td>
                <td style="padding: 8px 0;">${data.reason}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              You can submit a new request with the necessary corrections.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Request Rejected

Request ID: #${data.requestId}
Request Type: ${data.requestType}
Reviewed By: ${data.reviewerName}
Rejected: ${data.rejectedAt.toLocaleDateString()} at ${data.rejectedAt.toLocaleTimeString()}
Reason: ${data.reason}

You can submit a new request with the necessary corrections.
    `.trim();

    return this.sendWithRetry({
      to: requesterEmail,
      subject,
      html,
      text,
    });
  }
}

/**
 * Singleton instance of EmailService
 * Use this exported instance for all email operations
 */
export const emailService = new EmailService();

/**
 * Fire-and-forget email sending utility
 * Sends email asynchronously without blocking
 * Logs errors but does not throw
 */
export async function sendEmailAsync(
  emailFn: () => Promise<EmailResult>,
): Promise<void> {
  try {
    const result = await emailFn();
    if (!result.success) {
      console.error('[Email] Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('[Email] Unexpected error sending email:', error);
  }
}
