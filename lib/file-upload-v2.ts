/**
 * File Upload Helper for Invoice V2 System (Sprint 13)
 *
 * Handles file validation and upload for invoice attachments.
 * Uses existing storage infrastructure with magic bytes validation.
 */

import { db } from '@/lib/db';
import { createStorageService } from '@/lib/storage';
import { validateFileUpload, sanitizeFilename } from '@/lib/storage/validation';
import { getStorageConfig } from '@/lib/storage/factory';
import crypto from 'crypto';
import type { Prisma } from '@prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

const storageConfig = getStorageConfig();
const MAX_FILE_SIZE = storageConfig.maxFileSize || 10485760; // 10MB

/**
 * Magic bytes for file type validation
 */
const MAGIC_BYTES: Record<string, number[]> = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  PNG: [0x89, 0x50, 0x4e, 0x47], // PNG
  JPEG: [0xff, 0xd8, 0xff], // JPEG
  DOCX: [0x50, 0x4b, 0x03, 0x04], // ZIP (DOCX is zipped XML)
};

/**
 * Allowed MIME types for invoice files
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Validate file magic bytes (not just MIME type)
 *
 * @param buffer - File buffer
 * @param mimeType - Declared MIME type
 * @returns true if magic bytes match expected type
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  let expectedBytes: number[] | undefined;

  switch (mimeType) {
    case 'application/pdf':
      expectedBytes = MAGIC_BYTES.PDF;
      break;
    case 'image/png':
      expectedBytes = MAGIC_BYTES.PNG;
      break;
    case 'image/jpeg':
      expectedBytes = MAGIC_BYTES.JPEG;
      break;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      expectedBytes = MAGIC_BYTES.DOCX;
      break;
    default:
      return false;
  }

  if (!expectedBytes) {
    return false;
  }

  // Check if buffer has enough bytes
  if (buffer.length < expectedBytes.length) {
    return false;
  }

  // Compare magic bytes
  for (let i = 0; i < expectedBytes.length; i++) {
    if (buffer[i] !== expectedBytes[i]) {
      // Special case for JPEG: Multiple valid signatures
      if (mimeType === 'image/jpeg' && i === 2) {
        continue; // 4th byte varies in JPEG
      }
      return false;
    }
  }

  return true;
}

/**
 * Validate file for upload
 *
 * @param file - File to validate
 * @returns Validation result
 */
async function validateFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check file exists
  if (!file || file.size === 0) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds limit. Maximum allowed: ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Allowed types: PDF, PNG, JPG, DOCX',
    };
  }

  // Convert to buffer for magic bytes check
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validate magic bytes
  if (!validateMagicBytes(buffer, file.type)) {
    return {
      valid: false,
      error: 'File type mismatch. The actual file type does not match the declared type.',
    };
  }

  // Use existing comprehensive validation
  const validation = validateFileUpload(buffer, file.name, file.type, MAX_FILE_SIZE);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.errors.join('; '),
    };
  }

  return { valid: true };
}

// ============================================================================
// FILENAME GENERATION
// ============================================================================

/**
 * Generate unique filename with timestamp and UUID
 *
 * @param originalName - Original filename
 * @returns Unique filename
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID().split('-')[0]; // First segment of UUID
  const sanitized = sanitizeFilename(originalName);

  // Extract extension
  const parts = sanitized.split('.');
  const extension = parts.length > 1 ? parts[parts.length - 1] : 'pdf';
  const nameWithoutExt = parts
    .slice(0, parts.length - 1)
    .join('.')
    .substring(0, 50); // Limit name length

  return `${timestamp}_${uuid}_${nameWithoutExt}.${extension}`;
}

/**
 * Generate storage path for invoice file
 *
 * Format: invoices/{year}/{month}/{invoice_id}/{filename}
 *
 * @param invoiceId - Invoice ID
 * @param filename - Unique filename
 * @returns Storage path
 */
function generateStoragePath(invoiceId: number, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `invoices/${year}/${month}/${invoiceId}/${filename}`;
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

/**
 * Upload invoice file and create attachment record
 *
 * @param file - File to upload
 * @param invoiceId - Invoice ID
 * @param userId - User ID (uploader)
 * @param tx - Optional Prisma transaction context (for transactional integrity)
 * @returns Attachment ID
 * @throws Error if upload fails
 */
export async function uploadInvoiceFile(
  file: File,
  invoiceId: number,
  userId: number,
  tx?: Prisma.TransactionClient
): Promise<string> {
  // 1. Validate file
  const validation = await validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'File validation failed');
  }

  // 2. Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 3. Fetch invoice details for folder organization
  const dbClient = tx || db;
  const invoice = await dbClient.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      invoice_date: true,
      is_recurring: true,
      invoice_profile: {
        select: { name: true },
      },
    },
  });

  // 4. Generate unique filename and storage path
  const uniqueFilename = generateUniqueFilename(file.name);
  const storagePath = generateStoragePath(invoiceId, uniqueFilename);

  // 5. Upload to storage with invoice metadata for proper folder routing
  const storage = createStorageService();
  const uploadResult = await storage.upload(buffer, uniqueFilename, {
    invoiceId,
    userId,
    originalName: file.name,
    mimeType: file.type,
    invoiceDate: invoice?.invoice_date ?? undefined,
    isRecurring: invoice?.is_recurring ?? false,
    profileName: invoice?.invoice_profile?.name ?? undefined,
  });

  if (!uploadResult.success) {
    throw new Error(uploadResult.error || 'Failed to upload file to storage');
  }

  // 6. Create database record (dbClient already set above)
  const attachment = await dbClient.invoiceAttachment.create({
    data: {
      invoice_id: invoiceId,
      file_name: uniqueFilename,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: uploadResult.path || storagePath,
      uploaded_by: userId,
    },
  });

  // 7. Log success
  console.log('[file-upload-v2] File uploaded successfully:', {
    attachmentId: attachment.id,
    invoiceId,
    fileName: file.name,
    fileSize: file.size,
  });

  return attachment.id;
}

/**
 * Validate file without uploading (for preview/validation)
 *
 * @param file - File to validate
 * @returns Validation result
 */
export async function validateInvoiceFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  return validateFile(file);
}

/**
 * Check if MIME type is allowed
 *
 * @param mimeType - MIME type to check
 * @returns true if allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Get allowed MIME types list
 *
 * @returns Array of allowed MIME types
 */
export function getAllowedMimeTypes(): string[] {
  return [...ALLOWED_MIME_TYPES];
}

/**
 * Get max file size
 *
 * @returns Max file size in bytes
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}
