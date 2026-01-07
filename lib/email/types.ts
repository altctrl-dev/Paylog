/**
 * Email Types
 * Type definitions for email service operations
 */

/**
 * Base email options for sending emails
 */
export interface EmailOptions {
  /** Recipient email address */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** HTML email body */
  html: string;
  /** Plain text email body (fallback) */
  text?: string;
  /** Reply-to email address */
  replyTo?: string;
}

/**
 * Result of email sending operation
 */
export interface EmailResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Unique identifier for the sent message (if successful) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Template data for new master data request notification
 */
export interface NewRequestTemplateData {
  /** ID of the request */
  requestId: string;
  /** Type of master data being requested */
  requestType: string;
  /** Name of the user who submitted the request */
  requesterName: string;
  /** Email of the user who submitted the request */
  requesterEmail: string;
  /** Description or details of the request */
  description?: string;
  /** Date the request was submitted */
  submittedAt: Date;
}

/**
 * Template data for approval notification
 */
export interface ApprovalTemplateData {
  /** ID of the request */
  requestId: string;
  /** Type of master data that was approved */
  requestType: string;
  /** Name of the approver */
  approverName: string;
  /** Comments from the approver */
  comments?: string;
  /** Date the request was approved */
  approvedAt: Date;
}

/**
 * Template data for rejection notification
 */
export interface RejectionTemplateData {
  /** ID of the request */
  requestId: string;
  /** Type of master data that was rejected */
  requestType: string;
  /** Name of the reviewer who rejected */
  reviewerName: string;
  /** Reason for rejection */
  reason: string;
  /** Date the request was rejected */
  rejectedAt: Date;
}

/**
 * Template data for admin login alert notification
 */
export interface AdminLoginAlertData {
  /** Email of the admin who logged in */
  email: string;
  /** Name of the admin */
  name: string;
  /** Time of login */
  loginTime: Date;
  /** IP address (if available) */
  ipAddress?: string;
  /** User agent/browser (if available) */
  userAgent?: string;
}
