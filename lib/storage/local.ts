/**
 * Local Filesystem Storage Service
 *
 * Implements StorageService interface for local filesystem storage.
 *
 * Features:
 * - Hierarchical directory structure: /uploads/invoices/{year}/{month}/{invoice_id}/
 * - Atomic file writes (write to temp, then rename)
 * - Proper error handling for disk space, permissions
 * - File existence checks
 * - Safe path handling (no path traversal)
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import {
  StorageService,
  StorageResult,
  UploadMetadata,
  StorageError,
  StorageErrorType,
} from './interface';
import { sanitizeFilename, validateStoragePath } from './validation';

// ============================================================================
// LOCAL STORAGE SERVICE
// ============================================================================

export class LocalStorageService implements StorageService {
  private baseDir: string;

  /**
   * Create a new local storage service
   *
   * @param baseDir - Base directory for storage (default: ./uploads)
   */
  constructor(baseDir: string = './uploads') {
    // Resolve to absolute path
    this.baseDir = path.resolve(baseDir);
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Upload a file to local storage
   *
   * @param file - File buffer
   * @param fileName - Original filename
   * @param metadata - Upload metadata
   * @returns Storage result with path and size
   */
  async upload(
    file: Buffer,
    fileName: string,
    metadata: UploadMetadata
  ): Promise<StorageResult> {
    try {
      // 1. Generate storage path
      const sanitized = sanitizeFilename(fileName);
      const uniqueFilename = this.generateUniqueFilename(sanitized);
      const relativePath = this.buildStoragePath(metadata, uniqueFilename);
      const absolutePath = path.join(this.baseDir, relativePath);

      // 2. Validate path (security check)
      if (!this.isPathSafe(absolutePath)) {
        return {
          success: false,
          error: 'Invalid storage path detected',
        };
      }

      // 3. Create directory structure
      const dir = path.dirname(absolutePath);
      await this.ensureDirectoryExists(dir);

      // 4. Write file atomically (temp -> rename)
      await this.writeFileAtomic(absolutePath, file);

      // 5. Verify file was written correctly
      const stats = await fs.stat(absolutePath);

      return {
        success: true,
        path: relativePath,
        size: stats.size,
      };
    } catch (error) {
      console.error('[LocalStorage] Upload failed:', error);

      // Provide user-friendly error messages
      if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
        return {
          success: false,
          error: 'Insufficient disk space',
        };
      }

      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return {
          success: false,
          error: 'Permission denied',
        };
      }

      return {
        success: false,
        error: 'File upload failed',
      };
    }
  }

  /**
   * Download a file from storage
   *
   * @param storagePath - Relative storage path
   * @returns File buffer
   * @throws StorageError if file not found or inaccessible
   */
  async download(storagePath: string): Promise<Buffer> {
    try {
      // Validate path
      if (!validateStoragePath(storagePath)) {
        throw new StorageError(
          StorageErrorType.INVALID_PATH,
          'Invalid storage path'
        );
      }

      // Resolve absolute path
      const absolutePath = path.join(this.baseDir, storagePath);

      // Security check: Ensure resolved path is within base directory
      if (!this.isPathSafe(absolutePath)) {
        throw new StorageError(
          StorageErrorType.INVALID_PATH,
          'Path traversal attempt detected'
        );
      }

      // Check if file exists
      const exists = await this.fileExists(absolutePath);
      if (!exists) {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'File not found'
        );
      }

      // Read and return file
      const buffer = await fs.readFile(absolutePath);
      return buffer;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'File not found',
          error
        );
      }

      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new StorageError(
          StorageErrorType.PERMISSION_DENIED,
          'Permission denied',
          error
        );
      }

      throw new StorageError(
        StorageErrorType.DOWNLOAD_FAILED,
        'Failed to download file',
        error
      );
    }
  }

  /**
   * Delete a file from storage
   *
   * Note: This physically deletes the file. Ensure database soft-delete
   * is performed first.
   *
   * @param storagePath - Relative storage path
   * @throws StorageError if deletion fails
   */
  async delete(storagePath: string): Promise<void> {
    try {
      // Validate path
      if (!validateStoragePath(storagePath)) {
        throw new StorageError(
          StorageErrorType.INVALID_PATH,
          'Invalid storage path'
        );
      }

      // Resolve absolute path
      const absolutePath = path.join(this.baseDir, storagePath);

      // Security check
      if (!this.isPathSafe(absolutePath)) {
        throw new StorageError(
          StorageErrorType.INVALID_PATH,
          'Path traversal attempt detected'
        );
      }

      // Check if file exists
      const exists = await this.fileExists(absolutePath);
      if (!exists) {
        // File doesn't exist - consider this a success (idempotent delete)
        return;
      }

      // Delete file
      await fs.unlink(absolutePath);

      // Optionally clean up empty directories
      await this.cleanupEmptyDirectories(path.dirname(absolutePath));
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - success (idempotent)
        return;
      }

      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete file',
        error
      );
    }
  }

  /**
   * Check if a file exists
   *
   * @param storagePath - Relative storage path
   * @returns true if file exists
   */
  async exists(storagePath: string): Promise<boolean> {
    try {
      // Validate path
      if (!validateStoragePath(storagePath)) {
        return false;
      }

      const absolutePath = path.join(this.baseDir, storagePath);

      // Security check
      if (!this.isPathSafe(absolutePath)) {
        return false;
      }

      return await this.fileExists(absolutePath);
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Generate a unique filename
   *
   * Format: {timestamp}_{random}_{sanitized_original_name}
   *
   * @param sanitizedName - Already sanitized filename
   * @returns Unique filename
   */
  private generateUniqueFilename(sanitizedName: string): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex'); // 8 chars
    const ext = path.extname(sanitizedName);
    const nameWithoutExt = sanitizedName.substring(
      0,
      sanitizedName.length - ext.length
    );
    return `${timestamp}_${random}_${nameWithoutExt}${ext}`;
  }

  /**
   * Build storage path based on invoice metadata
   *
   * Structure:
   * - Recurring: invoices/{year}/Recurring/{profileName}/{filename}
   * - One-time:  invoices/{year}/one-time/{monthName}/{filename}
   *
   * Examples:
   * - Recurring: invoices/2025/Recurring/Rent/file.pdf
   * - One-time:  invoices/2025/one-time/Dec/file.pdf
   *
   * @param metadata - Upload metadata with invoice details
   * @param filename - Unique filename
   * @returns Relative storage path
   */
  private buildStoragePath(metadata: UploadMetadata, filename: string): string {
    // Use invoice date if available, otherwise fall back to current date
    const date = metadata.invoiceDate ? new Date(metadata.invoiceDate) : new Date();
    const year = date.getFullYear();

    // Month names for one-time invoices
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[date.getMonth()];

    if (metadata.isRecurring && metadata.profileName) {
      // Recurring: invoices/2025/Recurring/Rent/file.pdf
      const sanitizedProfileName = this.sanitizeFolderName(metadata.profileName);
      return path.join('invoices', String(year), 'Recurring', sanitizedProfileName, filename);
    } else {
      // One-time: invoices/2025/one-time/Dec/file.pdf
      return path.join('invoices', String(year), 'one-time', monthName, filename);
    }
  }

  /**
   * Sanitize a string for use as a folder name
   * Removes/replaces characters that are invalid in folder names
   */
  private sanitizeFolderName(name: string): string {
    // Invalid characters for most filesystems: / \ : * ? " < > |
    // Also replace multiple spaces with single space, trim
    return name
      .replace(/[\/\\:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Ensure directory exists (create if needed)
   *
   * @param dirPath - Absolute directory path
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      // Directory already exists - OK
    }
  }

  /**
   * Write file atomically (write to temp, then rename)
   *
   * This ensures the file is fully written before becoming visible.
   * Prevents partial writes in case of crashes.
   *
   * @param filePath - Absolute file path
   * @param data - File data
   */
  private async writeFileAtomic(filePath: string, data: Buffer): Promise<void> {
    const tempPath = `${filePath}.tmp.${randomBytes(4).toString('hex')}`;

    try {
      // Write to temp file
      await fs.writeFile(tempPath, data, { mode: 0o644 });

      // Atomically rename temp to final path
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Check if file exists (async)
   *
   * @param filePath - Absolute file path
   * @returns true if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fsSync.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if path is safe (within base directory)
   *
   * Prevents path traversal attacks.
   *
   * @param absolutePath - Absolute path to check
   * @returns true if path is safe
   */
  private isPathSafe(absolutePath: string): boolean {
    // Resolve path (removes .., ., etc.)
    const resolved = path.resolve(absolutePath);

    // Ensure resolved path starts with base directory
    // (i.e., is within base directory)
    return resolved.startsWith(this.baseDir);
  }

  /**
   * Clean up empty directories after file deletion
   *
   * Removes empty invoice_id, month, year directories recursively.
   * Stops at base directory.
   *
   * @param dirPath - Directory to check and clean
   */
  private async cleanupEmptyDirectories(dirPath: string): Promise<void> {
    try {
      // Don't delete base directory
      if (dirPath === this.baseDir || !dirPath.startsWith(this.baseDir)) {
        return;
      }

      // Check if directory is empty
      const entries = await fs.readdir(dirPath);
      if (entries.length === 0) {
        // Directory is empty - delete it
        await fs.rmdir(dirPath);

        // Recursively clean parent directory
        await this.cleanupEmptyDirectories(path.dirname(dirPath));
      }
    } catch {
      // Ignore errors during cleanup (non-critical)
    }
  }
}
