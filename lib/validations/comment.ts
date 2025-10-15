/**
 * Comment Validation Schemas
 *
 * Zod schemas for validating comment operations.
 * Sprint 7: Comments & Discussions
 */

import { z } from 'zod';
import { MAX_COMMENT_LENGTH } from '@/types/comment';

/**
 * Comment form validation schema
 * Validates comment content before submission
 */
export const commentSchema = z.object({
  text: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(MAX_COMMENT_LENGTH, `Comment too long (max ${MAX_COMMENT_LENGTH} characters)`)
    .refine((val) => val.trim().length > 0, {
      message: 'Comment cannot be only whitespace',
    }),
});

/**
 * Infer TypeScript type from schema
 */
export type CommentFormData = z.infer<typeof commentSchema>;

/**
 * Comment ID validation schema
 */
export const commentIdSchema = z.string().cuid();

/**
 * Edit comment validation schema
 */
export const editCommentSchema = z.object({
  commentId: commentIdSchema,
  text: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(MAX_COMMENT_LENGTH, `Comment too long (max ${MAX_COMMENT_LENGTH} characters)`)
    .refine((val) => val.trim().length > 0, {
      message: 'Comment cannot be only whitespace',
    }),
});

/**
 * Delete comment validation schema
 */
export const deleteCommentSchema = z.object({
  commentId: commentIdSchema,
});

/**
 * Get comments validation schema
 */
export const getCommentsSchema = z.object({
  invoiceId: z.number().int().positive(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().max(100).default(20),
  includeDeleted: z.boolean().default(false),
});
