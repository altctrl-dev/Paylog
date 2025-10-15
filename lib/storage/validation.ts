/**
 * File Validation Utilities
 *
 * Security-focused validation for file uploads:
 * - MIME type validation with magic bytes
 * - File size validation
 * - Filename sanitization
 * - Extension validation
 * - Path traversal prevention
 */

import * as path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * MIME type magic byte signatures
 *
 * Used for real MIME type detection (not trusting user-provided MIME type)
 */
const MIME_SIGNATURES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
  'image/jpeg': [0xff, 0xd8, 0xff], // JPEG (multiple variants, checking first 3 bytes)
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    0x50, 0x4b, 0x03, 0x04,
  ], // DOCX (ZIP format)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    0x50, 0x4b, 0x03, 0x04,
  ], // XLSX (ZIP format)
  'application/zip': [0x50, 0x4b, 0x03, 0x04], // ZIP
};

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.docx',
  '.xlsx',
  '.xls',
  '.doc',
  '.txt',
  '.csv',
] as const;

/**
 * Default max file size (10MB)
 */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Default max files per invoice
 */
export const DEFAULT_MAX_FILES_PER_INVOICE = 10;

// ============================================================================
// MIME TYPE VALIDATION
// ============================================================================

/**
 * Validate MIME type using magic bytes
 *
 * This provides real file type detection by checking the file's
 * binary signature, preventing MIME type spoofing.
 *
 * @param buffer - File buffer
 * @param declaredMimeType - MIME type declared by user/browser
 * @returns true if magic bytes match declared MIME type
 */
export function validateMimeType(
  buffer: Buffer,
  declaredMimeType: string
): boolean {
  // Get the signature for the declared MIME type
  const signature = MIME_SIGNATURES[declaredMimeType];

  if (!signature) {
    // MIME type not in our signature list - reject
    return false;
  }

  // Check if buffer has enough bytes
  if (buffer.length < signature.length) {
    return false;
  }

  // Compare magic bytes
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      // Special case for JPEG: Multiple valid signatures exist
      if (declaredMimeType === 'image/jpeg' && i === 2) {
        // JPEG signatures: FFD8FFE0, FFD8FFE1, FFD8FFDB, etc.
        // First 3 bytes are FFD8FF, 4th byte varies
        continue;
      }
      return false;
    }
  }

  return true;
}

/**
 * Detect MIME type from buffer
 *
 * @param buffer - File buffer
 * @returns Detected MIME type or null
 */
export function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, signature] of Object.entries(MIME_SIGNATURES)) {
    if (buffer.length < signature.length) {
      continue;
    }

    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return mimeType;
    }
  }

  return null;
}

// ============================================================================
// FILE SIZE VALIDATION
// ============================================================================

/**
 * Validate file size
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes (default: 10MB)
 * @returns true if size is valid
 */
export function validateFileSize(
  size: number,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// FILENAME VALIDATION & SANITIZATION
// ============================================================================

/**
 * Validate filename
 *
 * Checks for:
 * - Path traversal attempts (.., /, \)
 * - Null bytes (\0)
 * - Control characters
 * - Empty filename
 *
 * @param filename - Original filename
 * @returns true if filename is valid
 */
export function validateFilename(filename: string): boolean {
  if (!filename || filename.trim().length === 0) {
    return false;
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    return false;
  }

  // Check for control characters (ASCII 0-31)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F]/.test(filename)) {
    return false;
  }

  // Check length (reasonable limit)
  if (filename.length > 255) {
    return false;
  }

  return true;
}

/**
 * Sanitize filename for safe storage
 *
 * Removes:
 * - Special characters
 * - Path separators
 * - Control characters
 * - Leading/trailing dots and spaces
 *
 * Replaces spaces and special chars with underscores.
 * Limits length to 100 characters (before extension).
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Get extension
  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = filename.substring(0, filename.length - ext.length);

  // Remove special characters, keep only alphanumeric, hyphen, underscore
  let sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^[_-]+|[_-]+$/g, ''); // Remove leading/trailing underscores/hyphens

  // Limit length (leave room for timestamp and random string)
  sanitized = sanitized.substring(0, 100);

  // If sanitization resulted in empty string, use default
  if (!sanitized) {
    sanitized = 'file';
  }

  return `${sanitized}${ext}`;
}

// ============================================================================
// EXTENSION VALIDATION
// ============================================================================

/**
 * Validate file extension
 *
 * @param filename - Filename with extension
 * @returns true if extension is allowed
 */
export function validateExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number]);
}

/**
 * Get allowed extensions list
 *
 * @returns Array of allowed extensions
 */
export function getAllowedExtensions(): readonly string[] {
  return ALLOWED_EXTENSIONS;
}

// ============================================================================
// PATH VALIDATION
// ============================================================================

/**
 * Validate storage path
 *
 * Ensures path is safe and doesn't contain traversal attempts.
 *
 * @param storagePath - Relative storage path
 * @returns true if path is valid
 */
export function validateStoragePath(storagePath: string): boolean {
  // Normalize path (removes .., ., etc.)
  const normalized = path.normalize(storagePath);

  // Ensure normalized path doesn't go outside base directory
  // (should not start with .. or contain ..)
  if (normalized.includes('..') || normalized.startsWith('/..')) {
    return false;
  }

  // Ensure path doesn't contain null bytes
  if (normalized.includes('\0')) {
    return false;
  }

  // Ensure path isn't empty
  if (normalized.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Sanitize storage path
 *
 * Removes leading slashes and normalizes path.
 *
 * @param storagePath - Original storage path
 * @returns Sanitized path
 */
export function sanitizeStoragePath(storagePath: string): string {
  // Normalize path
  let sanitized = path.normalize(storagePath);

  // Remove leading slash (we want relative paths)
  if (sanitized.startsWith('/')) {
    sanitized = sanitized.substring(1);
  }

  return sanitized;
}

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate file upload comprehensively
 *
 * Performs all validation checks in one call.
 *
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @param declaredMimeType - Declared MIME type
 * @param maxSize - Max file size (optional)
 * @returns Validation result with errors
 */
export function validateFileUpload(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): ValidationResult {
  const errors: string[] = [];

  // Filename validation
  if (!validateFilename(originalName)) {
    errors.push('Invalid filename. Filename contains illegal characters.');
  }

  // Extension validation
  if (!validateExtension(originalName)) {
    errors.push(
      `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // File size validation
  if (!validateFileSize(buffer.length, maxSize)) {
    errors.push(
      `File size exceeds limit. Maximum allowed: ${formatFileSize(maxSize)}`
    );
  }

  // MIME type validation
  if (!validateMimeType(buffer, declaredMimeType)) {
    errors.push(
      'File type mismatch. The actual file type does not match the declared type.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
