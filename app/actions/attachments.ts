/**
 * Server Actions: Invoice Attachment Operations
 *
 * Production-ready server actions for file upload, retrieval, and deletion.
 * All actions use NextAuth session for user context.
 *
 * Phase 3: Upload Infrastructure & Server Actions (Sprint 6)
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createStorageService } from '@/lib/storage';
import { validateFileUpload, sanitizeFilename } from '@/lib/storage/validation';
import { getStorageConfig } from '@/lib/storage/factory';
import type {
  AttachmentWithRelations,
  ServerActionResult,
} from '@/types/attachment';
import { revalidatePath } from 'next/cache';
import { INVOICE_STATUS } from '@/types/invoice';

// ============================================================================
// CONFIGURATION
// ============================================================================

const storageConfig = getStorageConfig();
const MAX_FILE_SIZE = storageConfig.maxFileSize || 10485760; // 10MB
const MAX_FILES_PER_INVOICE = storageConfig.maxFilesPerInvoice || 10;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user
 * Throws error if not authenticated
 */
async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role: session.user.role as string,
  };
}

/**
 * Check if user can upload to invoice
 * User must be:
 * 1. Invoice creator
 * 2. Admin or super_admin
 * 3. Invoice status allows edits (not paid, not rejected)
 */
async function checkUploadPermission(
  userId: number,
  invoiceId: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Get invoice with creator info
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      created_by: true,
      status: true,
      is_hidden: true,
    },
  });

  if (!invoice) {
    return { allowed: false, reason: 'Invoice not found' };
  }

  if (invoice.is_hidden) {
    return { allowed: false, reason: 'Cannot upload to hidden invoice' };
  }

  // Check if invoice status allows edits
  const editableStatuses = [
    INVOICE_STATUS.PENDING_APPROVAL,
    INVOICE_STATUS.ON_HOLD,
    INVOICE_STATUS.UNPAID,
    INVOICE_STATUS.PARTIAL,
    INVOICE_STATUS.OVERDUE,
  ];

  if (!editableStatuses.includes(invoice.status as any)) {
    return {
      allowed: false,
      reason: `Cannot upload to invoice with status: ${invoice.status}`,
    };
  }

  // Get user to check role
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Check if user is invoice creator or admin
  const isCreator = invoice.created_by === userId;
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (!isCreator && !isAdmin) {
    return {
      allowed: false,
      reason: 'Only invoice creator or admin can upload attachments',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can delete attachment
 * User must be:
 * 1. Attachment uploader
 * 2. Invoice creator
 * 3. Admin or super_admin
 */
async function checkDeletePermission(
  userId: number,
  attachmentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Get attachment with relations
  const attachment = await db.invoiceAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      invoice: {
        select: {
          created_by: true,
          is_hidden: true,
        },
      },
    },
  });

  if (!attachment) {
    return { allowed: false, reason: 'Attachment not found' };
  }

  if (attachment.deleted_at) {
    return { allowed: false, reason: 'Attachment already deleted' };
  }

  if (attachment.invoice.is_hidden) {
    return { allowed: false, reason: 'Cannot delete attachment from hidden invoice' };
  }

  // Get user to check role
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Check if user is uploader, invoice creator, or admin
  const isUploader = attachment.uploaded_by === userId;
  const isInvoiceCreator = attachment.invoice.created_by === userId;
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (!isUploader && !isInvoiceCreator && !isAdmin) {
    return {
      allowed: false,
      reason: 'Only uploader, invoice creator, or admin can delete attachments',
    };
  }

  return { allowed: true };
}

/**
 * Validate attachment count limit
 */
async function validateAttachmentCount(
  invoiceId: number
): Promise<{ valid: boolean; count: number }> {
  const count = await db.invoiceAttachment.count({
    where: {
      invoice_id: invoiceId,
      deleted_at: null,
    },
  });

  return {
    valid: count < MAX_FILES_PER_INVOICE,
    count,
  };
}

/**
 * Generate storage path for attachment
 * Format: invoices/{year}/{month}/{invoice_id}/{filename}
 */
function generateStoragePath(invoiceId: number, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `invoices/${year}/${month}/${invoiceId}/${filename}`;
}

/**
 * Generate unique filename with timestamp and random string
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = sanitizeFilename(originalName);
  return `${timestamp}_${random}_${sanitized}`;
}

/**
 * Process file upload from FormData
 */
async function processFileUpload(formData: FormData): Promise<{
  file: File;
  buffer: Buffer;
}> {
  // Extract file from FormData
  const file = formData.get('file') as File;

  if (!file) {
    throw new Error('No file provided');
  }

  // Convert to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validate file
  const validation = validateFileUpload(
    buffer,
    file.name,
    file.type,
    MAX_FILE_SIZE
  );

  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  return { file, buffer };
}

/**
 * Log attachment operation
 */
function logAttachmentOperation(
  operation: 'upload' | 'delete' | 'download',
  userId: number,
  invoiceId: number,
  attachmentId?: string,
  metadata?: Record<string, any>
) {
  console.log(`[Attachments] ${operation}:`, {
    userId,
    invoiceId,
    attachmentId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Upload attachment to invoice
 *
 * @param invoiceId - Invoice ID
 * @param formData - FormData with file
 * @returns Created attachment with ID
 */
export async function uploadAttachment(
  invoiceId: number,
  formData: FormData
): Promise<ServerActionResult<{ attachmentId: string }>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. Check upload permission
    const permissionCheck = await checkUploadPermission(user.id, invoiceId);
    if (!permissionCheck.allowed) {
      logAttachmentOperation('upload', user.id, invoiceId, undefined, {
        error: permissionCheck.reason,
      });
      return {
        success: false,
        error: permissionCheck.reason || 'Upload not allowed',
      };
    }

    // 3. Validate attachment count limit
    const countCheck = await validateAttachmentCount(invoiceId);
    if (!countCheck.valid) {
      logAttachmentOperation('upload', user.id, invoiceId, undefined, {
        error: 'Attachment limit exceeded',
        currentCount: countCheck.count,
      });
      return {
        success: false,
        error: `Maximum ${MAX_FILES_PER_INVOICE} attachments per invoice. Current: ${countCheck.count}`,
      };
    }

    // 4. Process file upload
    const { file, buffer } = await processFileUpload(formData);

    // 5. Generate unique filename and storage path
    const uniqueFilename = generateUniqueFilename(file.name);
    const storagePath = generateStoragePath(invoiceId, uniqueFilename);

    // 6. Upload to storage
    const storage = createStorageService();
    const uploadResult = await storage.upload(buffer, uniqueFilename, {
      invoiceId,
      userId: user.id,
      originalName: file.name,
      mimeType: file.type,
    });

    if (!uploadResult.success) {
      logAttachmentOperation('upload', user.id, invoiceId, undefined, {
        error: uploadResult.error,
      });
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload file to storage',
      };
    }

    // 7. Create database record
    const attachment = await db.invoiceAttachment.create({
      data: {
        invoice_id: invoiceId,
        file_name: uniqueFilename,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: uploadResult.path || storagePath,
        uploaded_by: user.id,
      },
    });

    // 8. Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    // 9. Log success
    logAttachmentOperation('upload', user.id, invoiceId, attachment.id, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    return {
      success: true,
      data: { attachmentId: attachment.id },
    };
  } catch (error) {
    console.error('[Attachments] uploadAttachment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload attachment',
    };
  }
}

/**
 * Get attachments for invoice
 *
 * @param invoiceId - Invoice ID
 * @param includeDeleted - Include soft-deleted attachments
 * @returns List of attachments with relations
 */
export async function getAttachments(
  invoiceId: number,
  includeDeleted = false
): Promise<ServerActionResult<AttachmentWithRelations[]>> {
  try {
    // 1. Authenticate user
    await getCurrentUser();

    // 2. Check invoice exists and user has access
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, is_hidden: true },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.is_hidden) {
      return {
        success: false,
        error: 'Cannot access attachments for hidden invoice',
      };
    }

    // 3. Query attachments
    const attachments = await db.invoiceAttachment.findMany({
      where: {
        invoice_id: invoiceId,
        ...(includeDeleted ? {} : { deleted_at: null }),
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
          },
        },
        uploader: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        deleter: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        uploaded_at: 'desc',
      },
    });

    return {
      success: true,
      data: attachments as AttachmentWithRelations[],
    };
  } catch (error) {
    console.error('[Attachments] getAttachments error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch attachments',
    };
  }
}

/**
 * Delete attachment (soft delete)
 *
 * @param attachmentId - Attachment ID
 * @returns Success result
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<ServerActionResult<void>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. Check delete permission
    const permissionCheck = await checkDeletePermission(user.id, attachmentId);
    if (!permissionCheck.allowed) {
      logAttachmentOperation('delete', user.id, 0, attachmentId, {
        error: permissionCheck.reason,
      });
      return {
        success: false,
        error: permissionCheck.reason || 'Delete not allowed',
      };
    }

    // 3. Soft delete (set deleted_at, deleted_by)
    const attachment = await db.invoiceAttachment.update({
      where: { id: attachmentId },
      data: {
        deleted_at: new Date(),
        deleted_by: user.id,
      },
      select: {
        invoice_id: true,
        original_name: true,
      },
    });

    // 4. Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${attachment.invoice_id}`);

    // 5. Log success
    logAttachmentOperation('delete', user.id, attachment.invoice_id, attachmentId, {
      fileName: attachment.original_name,
    });

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('[Attachments] deleteAttachment error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete attachment',
    };
  }
}

/**
 * Get single attachment metadata
 *
 * @param attachmentId - Attachment ID
 * @returns Attachment with relations
 */
export async function getAttachment(
  attachmentId: string
): Promise<ServerActionResult<AttachmentWithRelations>> {
  try {
    // 1. Authenticate user
    await getCurrentUser();

    // 2. Get attachment with relations
    const attachment = await db.invoiceAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            is_hidden: true,
          },
        },
        uploader: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        deleter: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: 'Attachment not found',
      };
    }

    // 3. Check access permissions (cannot access hidden invoice attachments)
    if (attachment.invoice.is_hidden) {
      return {
        success: false,
        error: 'Cannot access attachment from hidden invoice',
      };
    }

    return {
      success: true,
      data: attachment as AttachmentWithRelations,
    };
  } catch (error) {
    console.error('[Attachments] getAttachment error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch attachment',
    };
  }
}

/**
 * Check if user can upload to invoice
 *
 * @param invoiceId - Invoice ID
 * @returns Upload permission check result
 */
export async function canUploadToInvoice(
  invoiceId: number
): Promise<
  ServerActionResult<{ canUpload: boolean; reason?: string; currentCount?: number }>
> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    // 2. Check upload permission
    const permissionCheck = await checkUploadPermission(user.id, invoiceId);
    if (!permissionCheck.allowed) {
      return {
        success: true,
        data: {
          canUpload: false,
          reason: permissionCheck.reason,
        },
      };
    }

    // 3. Check attachment count limit
    const countCheck = await validateAttachmentCount(invoiceId);
    if (!countCheck.valid) {
      return {
        success: true,
        data: {
          canUpload: false,
          reason: `Maximum ${MAX_FILES_PER_INVOICE} attachments reached`,
          currentCount: countCheck.count,
        },
      };
    }

    return {
      success: true,
      data: {
        canUpload: true,
        currentCount: countCheck.count,
      },
    };
  } catch (error) {
    console.error('[Attachments] canUploadToInvoice error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to check upload permission',
    };
  }
}
