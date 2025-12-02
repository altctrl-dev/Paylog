/**
 * Storage Service Interface
 *
 * Defines the contract for file storage operations.
 * Supports multiple storage providers (local filesystem, S3, R2, etc.)
 */

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result of a storage operation
 */
export interface StorageResult {
  success: boolean;
  path?: string;
  error?: string;
  size?: number;
}

/**
 * Metadata required for file upload
 */
export interface UploadMetadata {
  invoiceId: number;
  userId: number;
  originalName: string;
  mimeType: string;
  // Invoice details for folder organization
  invoiceDate?: Date;
  isRecurring?: boolean;
  profileName?: string; // Invoice profile name for recurring invoices
}

// ============================================================================
// STORAGE SERVICE INTERFACE
// ============================================================================

/**
 * Generic storage service interface
 *
 * Implementations:
 * - LocalStorageService: Filesystem storage (default)
 * - S3StorageService: AWS S3 (future)
 * - R2StorageService: Cloudflare R2 (future)
 */
export interface StorageService {
  /**
   * Upload a file to storage
   *
   * @param file - File buffer
   * @param fileName - Sanitized filename
   * @param metadata - Upload metadata (invoice ID, user ID, etc.)
   * @returns Storage result with path and size
   */
  upload(
    file: Buffer,
    fileName: string,
    metadata: UploadMetadata
  ): Promise<StorageResult>;

  /**
   * Download a file from storage
   *
   * @param path - Storage path (relative)
   * @returns File buffer
   * @throws Error if file not found or inaccessible
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   *
   * Note: For soft-delete workflows, this should be called
   * separately from database operations. Database row is soft-deleted
   * first, then file is physically deleted after confirmation.
   *
   * @param path - Storage path (relative)
   * @returns void
   * @throws Error if file not found or deletion fails
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists in storage
   *
   * @param path - Storage path (relative)
   * @returns true if file exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get a public URL for the file (optional)
   *
   * Only applicable for cloud storage providers (S3, R2).
   * Local filesystem storage will return undefined.
   *
   * @param path - Storage path (relative)
   * @returns Public URL or undefined
   */
  getPublicUrl?(path: string): string | undefined;
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  provider: 'local' | 's3' | 'r2' | 'sharepoint';
  baseDir?: string; // For local filesystem
  bucket?: string; // For S3/R2
  region?: string; // For S3/R2
  endpoint?: string; // For R2
  accessKeyId?: string; // For S3/R2
  secretAccessKey?: string; // For S3/R2
  maxFileSize?: number; // Max file size in bytes
  maxFilesPerInvoice?: number; // Max number of files per invoice
  allowedTypes?: string[]; // Allowed MIME types
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Storage error types
 */
export enum StorageErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  INVALID_PATH = 'INVALID_PATH',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
}

/**
 * Storage error class
 */
export class StorageError extends Error {
  constructor(
    public type: StorageErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
