/**
 * Invoice Attachment Type Definitions
 *
 * Type-safe contracts for invoice attachment CRUD operations.
 */

import type { Invoice } from './invoice';

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base invoice attachment type (from Prisma schema)
 */
export interface InvoiceAttachment {
  id: string;
  invoice_id: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: number;
  uploaded_at: Date;
  deleted_at: Date | null;
  deleted_by: number | null;
  scan_status: 'clean' | 'infected' | 'error' | null;
  scan_result: string | null;
}

/**
 * User type (minimal, for relations)
 */
export interface User {
  id: number;
  full_name: string;
  email: string;
}

/**
 * Invoice attachment with relations (for detail views)
 */
export interface AttachmentWithRelations extends InvoiceAttachment {
  invoice: {
    id: number;
    invoice_number: string;
  };
  uploader: User;
  deleter?: User | null;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Create attachment input
 * Used when uploading new attachments
 */
export interface CreateAttachmentInput {
  invoice_id: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: number;
}

/**
 * Update attachment input
 * Used for soft-deleting attachments
 */
export interface UpdateAttachmentInput {
  deleted_at?: Date;
  deleted_by?: number;
  scan_status?: 'clean' | 'infected' | 'error' | null;
  scan_result?: string | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Attachment list response (for invoice detail view)
 */
export interface AttachmentListResponse {
  attachments: AttachmentWithRelations[];
  total: number;
}

/**
 * Server action result type
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Allowed MIME types for attachments
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Maximum file size (10MB in bytes)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * File type display configuration
 */
export const FILE_TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  'application/pdf': {
    icon: 'FileText',
    label: 'PDF',
    color: 'text-red-600',
  },
  'image/jpeg': {
    icon: 'Image',
    label: 'JPEG',
    color: 'text-blue-600',
  },
  'image/jpg': {
    icon: 'Image',
    label: 'JPG',
    color: 'text-blue-600',
  },
  'image/png': {
    icon: 'Image',
    label: 'PNG',
    color: 'text-blue-600',
  },
  'image/gif': {
    icon: 'Image',
    label: 'GIF',
    color: 'text-purple-600',
  },
  'image/webp': {
    icon: 'Image',
    label: 'WEBP',
    color: 'text-blue-600',
  },
  'application/vnd.ms-excel': {
    icon: 'FileSpreadsheet',
    label: 'Excel',
    color: 'text-green-600',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    icon: 'FileSpreadsheet',
    label: 'Excel',
    color: 'text-green-600',
  },
  'application/msword': {
    icon: 'FileText',
    label: 'Word',
    color: 'text-blue-700',
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    icon: 'FileText',
    label: 'Word',
    color: 'text-blue-700',
  },
  'text/plain': {
    icon: 'FileText',
    label: 'Text',
    color: 'text-gray-600',
  },
  'text/csv': {
    icon: 'FileSpreadsheet',
    label: 'CSV',
    color: 'text-green-600',
  },
};

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

/**
 * Sanitize filename for storage
 * Removes special characters and spaces
 */
export function sanitizeFilename(filename: string): string {
  const extension = getFileExtension(filename);
  const nameWithoutExtension = filename.substring(
    0,
    filename.length - extension.length - 1
  );
  const sanitized = nameWithoutExtension
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100); // Limit length
  return `${sanitized}.${extension}`;
}

/**
 * Generate unique filename
 * Format: {timestamp}_{random}_{sanitized_original_name}
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = sanitizeFilename(originalName);
  return `${timestamp}_${random}_${sanitized}`;
}

/**
 * Generate storage path for attachment
 * Format: /uploads/invoices/{year}/{month}/{invoice_id}/{filename}
 */
export function generateStoragePath(
  invoiceId: number,
  filename: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `/uploads/invoices/${year}/${month}/${invoiceId}/${filename}`;
}
