/**
 * Storage Cleanup Utilities
 *
 * Background job utilities for cleaning up orphaned and soft-deleted files.
 * Should be called by cron jobs or admin actions.
 *
 * Phase 3: Upload Infrastructure & Server Actions (Sprint 6)
 */

import { db } from '@/lib/db';
import { createStorageService } from './factory';

// ============================================================================
// TYPES
// ============================================================================

interface CleanupResult {
  success: boolean;
  deletedFiles: number;
  deletedRecords: number;
  errors: string[];
  skipped: number;
}

interface CleanupOptions {
  olderThanDays?: number;
  dryRun?: boolean;
  batchSize?: number;
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clean up soft-deleted attachments
 *
 * Finds attachments with deleted_at > olderThanDays, deletes physical files,
 * and hard deletes from database.
 *
 * @param options - Cleanup options
 * @returns Cleanup result with metrics
 */
export async function cleanupDeletedFiles(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const {
    olderThanDays = 30,
    dryRun = false,
    batchSize = 50,
  } = options;

  const result: CleanupResult = {
    success: true,
    deletedFiles: 0,
    deletedRecords: 0,
    errors: [],
    skipped: 0,
  };

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log('[Cleanup] Starting cleanup job', {
      cutoffDate: cutoffDate.toISOString(),
      olderThanDays,
      dryRun,
      batchSize,
    });

    // Find attachments to clean up
    const attachmentsToDelete = await db.invoiceAttachment.findMany({
      where: {
        deleted_at: {
          not: null,
          lt: cutoffDate,
        },
      },
      take: batchSize,
      select: {
        id: true,
        storage_path: true,
        original_name: true,
        deleted_at: true,
      },
    });

    console.log('[Cleanup] Found attachments to delete:', attachmentsToDelete.length);

    if (attachmentsToDelete.length === 0) {
      console.log('[Cleanup] No attachments to clean up');
      return result;
    }

    // Process each attachment
    const storage = createStorageService();

    for (const attachment of attachmentsToDelete) {
      try {
        // Check if file exists
        const exists = await storage.exists(attachment.storage_path);

        if (!exists) {
          console.log('[Cleanup] File not found, skipping:', {
            id: attachment.id,
            path: attachment.storage_path,
          });
          result.skipped++;
          continue;
        }

        if (!dryRun) {
          // Delete physical file
          await storage.delete(attachment.storage_path);
          result.deletedFiles++;

          console.log('[Cleanup] Deleted file:', {
            id: attachment.id,
            path: attachment.storage_path,
            originalName: attachment.original_name,
          });

          // Hard delete from database
          await db.invoiceAttachment.delete({
            where: { id: attachment.id },
          });
          result.deletedRecords++;

          console.log('[Cleanup] Deleted database record:', {
            id: attachment.id,
          });
        } else {
          console.log('[Cleanup] [DRY RUN] Would delete:', {
            id: attachment.id,
            path: attachment.storage_path,
            originalName: attachment.original_name,
            deletedAt: attachment.deleted_at,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Cleanup] Error processing attachment:', {
          id: attachment.id,
          error: errorMessage,
        });
        result.errors.push(
          `Failed to process attachment ${attachment.id}: ${errorMessage}`
        );
        result.success = false;
      }
    }

    console.log('[Cleanup] Cleanup job completed', {
      deletedFiles: result.deletedFiles,
      deletedRecords: result.deletedRecords,
      errors: result.errors.length,
      skipped: result.skipped,
      dryRun,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Cleanup job failed:', errorMessage);
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

/**
 * Clean up orphaned files
 *
 * Finds files in storage that don't have corresponding database records
 * and deletes them. This handles cases where database record was deleted
 * but physical file wasn't.
 *
 * Note: This is more complex and requires directory traversal.
 * For now, we focus on soft-deleted cleanup. Orphan cleanup can be
 * implemented in a future phase if needed.
 *
 * @param options - Cleanup options
 * @returns Cleanup result with metrics
 */
export async function cleanupOrphanedFiles(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const { dryRun = false } = options;

  const result: CleanupResult = {
    success: true,
    deletedFiles: 0,
    deletedRecords: 0,
    errors: [],
    skipped: 0,
  };

  console.log('[Cleanup] Orphaned file cleanup not yet implemented', { dryRun });
  result.errors.push(
    'Orphaned file cleanup not yet implemented. Use cleanupDeletedFiles() instead.'
  );
  result.success = false;

  return result;
}

/**
 * Get cleanup statistics
 *
 * Returns information about files pending cleanup.
 *
 * @param olderThanDays - Days threshold
 * @returns Cleanup statistics
 */
export async function getCleanupStats(
  olderThanDays = 30
): Promise<{
  totalDeleted: number;
  oldestDeletedDate: Date | null;
  newestDeletedDate: Date | null;
  totalSizeBytes: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const deletedAttachments = await db.invoiceAttachment.findMany({
    where: {
      deleted_at: {
        not: null,
        lt: cutoffDate,
      },
    },
    select: {
      deleted_at: true,
      file_size: true,
    },
  });

  const totalDeleted = deletedAttachments.length;
  const totalSizeBytes = deletedAttachments.reduce(
    (sum, att) => sum + att.file_size,
    0
  );

  let oldestDeletedDate: Date | null = null;
  let newestDeletedDate: Date | null = null;

  if (deletedAttachments.length > 0) {
    const dates = deletedAttachments
      .map((att) => att.deleted_at!)
      .sort((a, b) => a.getTime() - b.getTime());

    oldestDeletedDate = dates[0];
    newestDeletedDate = dates[dates.length - 1];
  }

  return {
    totalDeleted,
    oldestDeletedDate,
    newestDeletedDate,
    totalSizeBytes,
  };
}

/**
 * Format cleanup statistics for display
 *
 * @param stats - Cleanup statistics
 * @returns Formatted string
 */
export function formatCleanupStats(stats: {
  totalDeleted: number;
  oldestDeletedDate: Date | null;
  newestDeletedDate: Date | null;
  totalSizeBytes: number;
}): string {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const lines = [
    `Total deleted attachments pending cleanup: ${stats.totalDeleted}`,
    `Total size: ${formatSize(stats.totalSizeBytes)}`,
  ];

  if (stats.oldestDeletedDate) {
    lines.push(
      `Oldest deleted: ${stats.oldestDeletedDate.toISOString().split('T')[0]}`
    );
  }

  if (stats.newestDeletedDate) {
    lines.push(
      `Newest deleted: ${stats.newestDeletedDate.toISOString().split('T')[0]}`
    );
  }

  return lines.join('\n');
}

// ============================================================================
// ADMIN UTILITIES
// ============================================================================

/**
 * Force delete attachment (admin only)
 *
 * Immediately deletes physical file and database record, bypassing
 * soft delete. Use with caution.
 *
 * @param attachmentId - Attachment ID
 * @returns Success status
 */
export async function forceDeleteAttachment(
  attachmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get attachment
    const attachment = await db.invoiceAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        storage_path: true,
        original_name: true,
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: 'Attachment not found',
      };
    }

    // Delete physical file
    const storage = createStorageService();
    const exists = await storage.exists(attachment.storage_path);

    if (exists) {
      await storage.delete(attachment.storage_path);
      console.log('[Cleanup] Force deleted file:', {
        id: attachment.id,
        path: attachment.storage_path,
      });
    }

    // Hard delete from database
    await db.invoiceAttachment.delete({
      where: { id: attachmentId },
    });

    console.log('[Cleanup] Force deleted database record:', {
      id: attachment.id,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Force delete failed:', {
      attachmentId,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Restore soft-deleted attachment (admin only)
 *
 * Undeletes an attachment by clearing deleted_at and deleted_by.
 * Only works if physical file still exists.
 *
 * @param attachmentId - Attachment ID
 * @returns Success status
 */
export async function restoreAttachment(
  attachmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get attachment
    const attachment = await db.invoiceAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        storage_path: true,
        deleted_at: true,
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: 'Attachment not found',
      };
    }

    if (!attachment.deleted_at) {
      return {
        success: false,
        error: 'Attachment is not deleted',
      };
    }

    // Check if physical file exists
    const storage = createStorageService();
    const exists = await storage.exists(attachment.storage_path);

    if (!exists) {
      return {
        success: false,
        error: 'Physical file no longer exists, cannot restore',
      };
    }

    // Restore attachment
    await db.invoiceAttachment.update({
      where: { id: attachmentId },
      data: {
        deleted_at: null,
        deleted_by: null,
      },
    });

    console.log('[Cleanup] Restored attachment:', {
      id: attachment.id,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Restore failed:', {
      attachmentId,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}
