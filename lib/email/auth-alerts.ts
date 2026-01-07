/**
 * Authentication Alert Emails
 * Handles security-related email notifications for admin logins
 */

import { Resend } from 'resend';
import { db } from '@/lib/db';
import type { AdminLoginAlertData, EmailResult } from './types';

/**
 * Get the configured login alert email from SystemSettings
 */
async function getLoginAlertEmail(): Promise<string | null> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'login_alert_email' },
    });
    return setting?.value || null;
  } catch (error) {
    console.error('[AuthAlerts] Error fetching login alert email:', error);
    return null;
  }
}

/**
 * Send an alert email when a super admin logs in via password
 * This is a security measure to detect unauthorized access
 */
export async function sendAdminLoginAlert(
  data: AdminLoginAlertData
): Promise<EmailResult> {
  const alertEmail = await getLoginAlertEmail();

  if (!alertEmail) {
    console.log('[AuthAlerts] No login alert email configured, skipping alert');
    return { success: true, messageId: 'no-alert-configured' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[AuthAlerts] RESEND_API_KEY not configured, skipping alert');
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || 'noreply@paylog.com';

  const subject = `Security Alert: Admin Login - ${data.email}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #92400e;">Security Alert: Admin Login</h1>
          <p style="margin: 0; color: #92400e;">An administrator logged in using password authentication</p>
        </div>

        <div style="background-color: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Admin Email:</td>
              <td style="padding: 8px 0;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Admin Name:</td>
              <td style="padding: 8px 0;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Login Time:</td>
              <td style="padding: 8px 0;">${data.loginTime.toLocaleString()}</td>
            </tr>
            ${
              data.ipAddress
                ? `
            <tr>
              <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">IP Address:</td>
              <td style="padding: 8px 0;">${data.ipAddress}</td>
            </tr>
            `
                : ''
            }
            ${
              data.userAgent
                ? `
            <tr>
              <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Browser:</td>
              <td style="padding: 8px 0; word-break: break-all;">${data.userAgent}</td>
            </tr>
            `
                : ''
            }
          </table>
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>If this wasn't you:</strong> Immediately change your password and review recent activity in the system.
          </p>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            This is an automated security notification from PayLog.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Security Alert: Admin Login

An administrator logged in using password authentication.

Admin Email: ${data.email}
Admin Name: ${data.name}
Login Time: ${data.loginTime.toLocaleString()}
${data.ipAddress ? `IP Address: ${data.ipAddress}` : ''}
${data.userAgent ? `Browser: ${data.userAgent}` : ''}

If this wasn't you, immediately change your password and review recent activity in the system.

This is an automated security notification from PayLog.
  `.trim();

  try {
    const result = await resend.emails.send({
      from,
      to: alertEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error('[AuthAlerts] Failed to send login alert:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[AuthAlerts] Login alert sent to', alertEmail);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[AuthAlerts] Error sending login alert:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
