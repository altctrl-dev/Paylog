/**
 * Email module public API
 * Exports all email-related types and services
 */

export { emailService, sendEmailAsync, EmailService } from './service';
export { emailConfig, validateEmailConfig } from './config';
export type {
  EmailOptions,
  EmailResult,
  NewRequestTemplateData,
  ApprovalTemplateData,
  RejectionTemplateData,
} from './types';
