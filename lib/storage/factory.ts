/**
 * Storage Factory
 *
 * Creates storage service instances based on configuration.
 * Supports multiple storage providers (local, S3, R2).
 */

import { StorageService, StorageConfig } from './interface';
import { LocalStorageService } from './local';
import { createSharePointStorage } from './sharepoint';

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a storage service instance based on environment configuration
 *
 * Reads from environment variables:
 * - STORAGE_PROVIDER: 'local' | 's3' | 'r2' | 'sharepoint' (default: 'local')
 * - UPLOAD_DIR: Base directory for local storage (default: './uploads')
 *
 * SharePoint provider env vars:
 * - AZURE_TENANT_ID
 * - AZURE_CLIENT_ID
 * - AZURE_CLIENT_SECRET
 * - SHAREPOINT_SITE_ID
 * - SHAREPOINT_DRIVE_ID (optional)
 * - SHAREPOINT_BASE_FOLDER (default: 'Paylog')
 *
 * Future cloud providers (S3, R2) will read additional env vars:
 * - STORAGE_BUCKET
 * - STORAGE_REGION
 * - STORAGE_ENDPOINT (for R2)
 * - STORAGE_ACCESS_KEY_ID
 * - STORAGE_SECRET_ACCESS_KEY
 *
 * @returns StorageService instance
 * @throws Error if provider is unknown or configuration is invalid
 */
export function createStorageService(): StorageService {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageConfig['provider'];

  switch (provider) {
    case 'local':
      return createLocalStorage();

    case 'sharepoint':
      return createSharePointStorage();

    case 's3':
      // TODO: Implement S3StorageService
      throw new Error(
        'S3 storage provider is not yet implemented. Use STORAGE_PROVIDER=local.'
      );

    case 'r2':
      // TODO: Implement R2StorageService
      throw new Error(
        'R2 storage provider is not yet implemented. Use STORAGE_PROVIDER=local.'
      );

    default:
      throw new Error(
        `Unknown storage provider: ${provider}. Supported: local, sharepoint, s3, r2.`
      );
  }
}

/**
 * Create a local filesystem storage service
 *
 * @returns LocalStorageService instance
 */
function createLocalStorage(): LocalStorageService {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  return new LocalStorageService(uploadDir);
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get storage configuration from environment
 *
 * @returns Storage configuration object
 */
export function getStorageConfig(): StorageConfig {
  return {
    provider: (process.env.STORAGE_PROVIDER || 'local') as StorageConfig['provider'],
    baseDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    maxFilesPerInvoice: parseInt(process.env.MAX_FILES_PER_INVOICE || '10', 10),
    allowedTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx'],
  };
}

/**
 * Validate storage configuration
 *
 * Ensures all required environment variables are set and valid.
 *
 * @returns Validation result
 */
export function validateStorageConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const config = getStorageConfig();

  // Validate provider
  if (!['local', 's3', 'r2', 'sharepoint'].includes(config.provider)) {
    errors.push(
      `Invalid STORAGE_PROVIDER: ${config.provider}. Must be 'local', 'sharepoint', 's3', or 'r2'.`
    );
  }

  // Validate max file size
  if (config.maxFileSize && config.maxFileSize <= 0) {
    errors.push('MAX_FILE_SIZE must be a positive number.');
  }

  // Validate max files per invoice
  if (config.maxFilesPerInvoice && config.maxFilesPerInvoice <= 0) {
    errors.push('MAX_FILES_PER_INVOICE must be a positive number.');
  }

  // Provider-specific validation
  if (config.provider === 's3') {
    if (!process.env.STORAGE_BUCKET) {
      errors.push('STORAGE_BUCKET is required for S3 provider.');
    }
    if (!process.env.STORAGE_REGION) {
      errors.push('STORAGE_REGION is required for S3 provider.');
    }
    if (!process.env.STORAGE_ACCESS_KEY_ID) {
      errors.push('STORAGE_ACCESS_KEY_ID is required for S3 provider.');
    }
    if (!process.env.STORAGE_SECRET_ACCESS_KEY) {
      errors.push('STORAGE_SECRET_ACCESS_KEY is required for S3 provider.');
    }
  }

  if (config.provider === 'r2') {
    if (!process.env.STORAGE_BUCKET) {
      errors.push('STORAGE_BUCKET is required for R2 provider.');
    }
    if (!process.env.STORAGE_ENDPOINT) {
      errors.push('STORAGE_ENDPOINT is required for R2 provider.');
    }
    if (!process.env.STORAGE_ACCESS_KEY_ID) {
      errors.push('STORAGE_ACCESS_KEY_ID is required for R2 provider.');
    }
    if (!process.env.STORAGE_SECRET_ACCESS_KEY) {
      errors.push('STORAGE_SECRET_ACCESS_KEY is required for R2 provider.');
    }
  }

  if (config.provider === 'sharepoint') {
    if (!process.env.AZURE_TENANT_ID) {
      errors.push('AZURE_TENANT_ID is required for SharePoint provider.');
    }
    if (!process.env.AZURE_CLIENT_ID) {
      errors.push('AZURE_CLIENT_ID is required for SharePoint provider.');
    }
    if (!process.env.AZURE_CLIENT_SECRET) {
      errors.push('AZURE_CLIENT_SECRET is required for SharePoint provider.');
    }
    if (!process.env.SHAREPOINT_SITE_ID) {
      errors.push('SHAREPOINT_SITE_ID is required for SharePoint provider.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
