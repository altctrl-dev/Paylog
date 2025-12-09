/**
 * Server Actions: Invoice Comment Operations
 *
 * Production-ready server actions for invoice comments with Markdown support.
 * Sprint 7 Phase 6: Comments Feature
 *
 * Key Features:
 * - RBAC: Standard users can delete own comments, admins can delete any
 * - Soft delete pattern (deleted_at, deleted_by)
 * - Activity logging for all comment actions
 * - Pagination support (default 20 per page)
 * - Edit tracking (is_edited flag)
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { commentSchema } from '@/lib/validations/comment';
import { createActivityLog } from '@/app/actions/activity-log';
import { ACTIVITY_ACTION } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import { revalidatePath } from 'next/cache';
import type {
  InvoiceCommentWithRelations,
  CommentsListResponse,
  ServerActionResult,
} from '@/types/comment';
import { DEFAULT_COMMENTS_PER_PAGE } from '@/types/comment';

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
 * Check if user is admin or super_admin
 */
function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Include relations for comment queries
 */
const commentInclude = {
  invoice: {
    select: {
      id: true,
      invoice_number: true,
    },
  },
  author: {
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
    },
  },
};

// ============================================================================
// CREATE OPERATION
// ============================================================================

/**
 * Create new comment on invoice
 *
 * @param invoiceId - Invoice ID
 * @param content - Comment text content (Markdown supported)
 * @returns Created comment with relations
 */
export async function createComment(
  invoiceId: number,
  content: string
): Promise<ServerActionResult<InvoiceCommentWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Validate input
    const validated = commentSchema.parse({ text: content });

    // Check invoice exists and is not hidden
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoice_number: true, is_archived: true },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.is_archived) {
      return {
        success: false,
        error: 'Cannot add comment to archived invoice',
      };
    }

    // Create comment
    const comment = await db.invoiceComment.create({
      data: {
        invoice_id: invoiceId,
        user_id: user.id,
        content: validated.text,
        is_edited: false,
      },
      include: commentInclude,
    });

    // Log activity (non-blocking)
    try {
      await createActivityLog({
        invoice_id: invoiceId,
        user_id: user.id,
        action: ACTIVITY_ACTION.COMMENT_ADDED,
        new_data: {
          comment_id: comment.id,
          content_preview: validated.text.substring(0, 100),
        },
      });
    } catch (error) {
      console.error('[createComment] Activity log failed:', error);
      // Continue - don't fail comment creation if logging fails
    }

    revalidatePath(`/invoices/${invoiceId}`);

    return {
      success: true,
      data: comment as InvoiceCommentWithRelations,
    };
  } catch (error) {
    console.error('createComment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment',
    };
  }
}

// ============================================================================
// READ OPERATION
// ============================================================================

/**
 * Get paginated comments for an invoice
 * Excludes soft-deleted comments by default
 *
 * @param invoiceId - Invoice ID
 * @param page - Page number (default 1)
 * @returns Paginated comment list with relations
 */
export async function getComments(
  invoiceId: number,
  page: number = 1
): Promise<ServerActionResult<CommentsListResponse>> {
  try {
    await getCurrentUser();

    // Check invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, is_archived: true },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.is_archived) {
      return {
        success: false,
        error: 'Cannot access comments for archived invoice',
      };
    }

    // Pagination
    const perPage = DEFAULT_COMMENTS_PER_PAGE;
    const skip = (page - 1) * perPage;

    // Query comments (exclude soft-deleted)
    const [comments, total] = await Promise.all([
      db.invoiceComment.findMany({
        where: {
          invoice_id: invoiceId,
          deleted_at: null, // Exclude soft-deleted comments
        },
        include: commentInclude,
        orderBy: {
          created_at: 'desc', // Newest first
        },
        skip,
        take: perPage,
      }),
      db.invoiceComment.count({
        where: {
          invoice_id: invoiceId,
          deleted_at: null,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        comments: comments as InvoiceCommentWithRelations[],
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    };
  } catch (error) {
    console.error('getComments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments',
    };
  }
}

// ============================================================================
// UPDATE OPERATION
// ============================================================================

/**
 * Update comment content
 * Only author can edit their own comment
 * Sets is_edited flag to true
 *
 * @param commentId - Comment ID (CUID)
 * @param content - New comment text
 * @returns Updated comment with relations
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<ServerActionResult<InvoiceCommentWithRelations>> {
  try {
    const user = await getCurrentUser();

    // Validate input
    const validated = commentSchema.parse({ text: content });

    // Check comment exists
    const existing = await db.invoiceComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        user_id: true,
        invoice_id: true,
        content: true,
        deleted_at: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Comment not found',
      };
    }

    // Check if comment is soft-deleted
    if (existing.deleted_at) {
      return {
        success: false,
        error: 'Cannot edit deleted comment',
      };
    }

    // Check ownership (only author can edit)
    if (existing.user_id !== user.id) {
      return {
        success: false,
        error: 'You can only edit your own comments',
      };
    }

    // Update comment
    const comment = await db.invoiceComment.update({
      where: { id: commentId },
      data: {
        content: validated.text,
        is_edited: true,
        updated_at: new Date(),
      },
      include: commentInclude,
    });

    // Log activity (non-blocking)
    try {
      await createActivityLog({
        invoice_id: existing.invoice_id,
        user_id: user.id,
        action: ACTIVITY_ACTION.COMMENT_EDITED,
        old_data: {
          comment_id: commentId,
          content_preview: existing.content.substring(0, 100),
        },
        new_data: {
          comment_id: commentId,
          content_preview: validated.text.substring(0, 100),
        },
      });
    } catch (error) {
      console.error('[updateComment] Activity log failed:', error);
      // Continue - don't fail update if logging fails
    }

    revalidatePath(`/invoices/${existing.invoice_id}`);

    return {
      success: true,
      data: comment as InvoiceCommentWithRelations,
    };
  } catch (error) {
    console.error('updateComment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update comment',
    };
  }
}

// ============================================================================
// DELETE OPERATION (SOFT DELETE)
// ============================================================================

/**
 * Soft delete comment (set deleted_at and deleted_by)
 * Standard users can delete own comments only
 * Admins can delete any comment
 *
 * @param commentId - Comment ID (CUID)
 * @returns Success result
 */
export async function deleteComment(
  commentId: string
): Promise<ServerActionResult<void>> {
  try {
    const user = await getCurrentUser();

    // Check comment exists
    const existing = await db.invoiceComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        user_id: true,
        invoice_id: true,
        content: true,
        deleted_at: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Comment not found',
      };
    }

    // Check if already deleted
    if (existing.deleted_at) {
      return {
        success: false,
        error: 'Comment is already deleted',
      };
    }

    // RBAC: Standard users can delete own only, admins can delete any
    const canDelete = existing.user_id === user.id || isAdmin(user.role);

    if (!canDelete) {
      return {
        success: false,
        error: 'You do not have permission to delete this comment',
      };
    }

    // Soft delete
    await db.invoiceComment.update({
      where: { id: commentId },
      data: {
        deleted_at: new Date(),
        deleted_by: user.id,
      },
    });

    // Log activity (non-blocking)
    try {
      await createActivityLog({
        invoice_id: existing.invoice_id,
        user_id: user.id,
        action: ACTIVITY_ACTION.COMMENT_DELETED,
        old_data: {
          comment_id: commentId,
          content_preview: existing.content.substring(0, 100),
        },
      });
    } catch (error) {
      console.error('[deleteComment] Activity log failed:', error);
      // Continue - don't fail delete if logging fails
    }

    revalidatePath(`/invoices/${existing.invoice_id}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('deleteComment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment',
    };
  }
}
