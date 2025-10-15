/**
 * Invoice Comment Type Definitions
 *
 * Type-safe contracts for invoice comments and discussions.
 * Sprint 7: Comments & Discussions
 */

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base invoice comment type (from Prisma schema)
 */
export interface InvoiceComment {
  id: string;
  invoice_id: number;
  user_id: number;
  content: string;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: number | null;
}

/**
 * Invoice comment with relations (for detail views)
 */
export interface InvoiceCommentWithRelations extends InvoiceComment {
  invoice: {
    id: number;
    invoice_number: string;
  };
  author: {
    id: number;
    full_name: string;
    email: string;
  };
  deleter?: {
    id: number;
    full_name: string;
  } | null;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Comment form data type
 * Used for creating and editing comments
 */
export type CommentFormData = {
  text: string;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated comments list response
 */
export type CommentsListResponse = {
  comments: InvoiceCommentWithRelations[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

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
 * Maximum comment length (characters)
 */
export const MAX_COMMENT_LENGTH = 2000;

/**
 * Default comments per page
 */
export const DEFAULT_COMMENTS_PER_PAGE = 20;
